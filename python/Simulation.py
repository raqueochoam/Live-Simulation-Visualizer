import simpy
import numpy as np
import random
import json

NUM_WORKSTATIONS = 6
NUM_BINS = 3
BIN_CAPACITY = 25
PROB_FAIL_MEAN = [0.22, 0.11, 0.17, 0.06, 0.08, 0.11]
PROB_FAIL_STD = 0.03
PROB_REJECTION = 0.05
PROB_ACCIDENT = 0.0001
AVERAGE_FIX_TIME = 3
AVERAGE_WORK_TIME = 4

SIM_TIME = 500
NUM_DAYS = 1

class ManufacturingFacility:
    def __init__(self, env):
        self.env = env
        self.workstations = [simpy.Resource(env, capacity=1) for _ in range(NUM_WORKSTATIONS)]
        self.bins = [simpy.Container(env, capacity=BIN_CAPACITY, init=BIN_CAPACITY) for _ in range(NUM_BINS)]
        self.supplier = simpy.Container(env, capacity=BIN_CAPACITY * NUM_WORKSTATIONS * NUM_BINS,
                                         init=BIN_CAPACITY * NUM_WORKSTATIONS * NUM_BINS)
        self.production_count = 0
        self.total_fix_time = 0
        self.total_delay_time = 0
        self.total_rejections = 0
        self.total_accidents = 0
        self.workstation_occupancy = [0] * NUM_WORKSTATIONS
        self.workstation_downtime = [0] * NUM_WORKSTATIONS
        self.workstation_idle_time = [0] * NUM_WORKSTATIONS
        self.workstation_waiting_time = [0] * NUM_WORKSTATIONS
        self.supplier_occupancy = 0

    def produce(self):
        while True:
            with self.supplier.get(BIN_CAPACITY * NUM_WORKSTATIONS) as bin:
                start_time = round(self.env.now, 2)
                yield self.env.timeout(np.random.normal(AVERAGE_WORK_TIME))

                if np.random.random() < PROB_ACCIDENT:
                    self.total_accidents += 1
                    yield self.env.timeout(100)

                for i in [0, 1, 2, 3, 4, 5]:
                    workstation = self.workstations[i]
                    with workstation.request() as req:
                        yield req

                        prob_fail = max(0, min(1, np.random.normal(PROB_FAIL_MEAN[i], PROB_FAIL_STD)))

                        if random.random() < prob_fail:
                            fix_time = round(np.random.exponential(AVERAGE_FIX_TIME), 2)
                            self.total_fix_time += fix_time
                            self.workstation_downtime[i] += fix_time
                            yield self.env.timeout(fix_time)

                        yield self.env.timeout(np.random.normal(AVERAGE_WORK_TIME))
                        self.workstation_occupancy[i] += 1

                        end_time = round(self.env.now, 2)

                        if req.triggered:
                            self.workstation_waiting_time[i] += self.env.now - start_time
                        else:
                            self.workstation_idle_time[i] += self.env.now - start_time

                if np.random.random() < PROB_REJECTION:
                    self.total_rejections += 1
                    continue

                end_time = round(self.env.now, 2)
                self.production_count += 1
                self.total_delay_time += round((end_time - start_time), 2)

    def get_daily_statistics(self):
        avg_production_day = int(self.production_count)
        avg_rejections_day = int(self.total_rejections)
        avg_fix_time_day = float(self.total_fix_time)
        avg_delay_due_to_bottleneck_day = float(self.total_delay_time)
        avg_accidents_day = int(self.total_accidents)

        avg_occupancy_day = [int(occ) for occ in self.workstation_occupancy]
        avg_downtime_day = [float(downtime) for downtime in self.workstation_downtime]
        avg_idle_time = [float(idle) for idle in self.workstation_idle_time]
        avg_waiting_time = [float(waiting) for waiting in self.workstation_waiting_time]

        rejection_percentage = round((avg_rejections_day / avg_production_day) * 100, 2) if avg_production_day != 0 else 0.0

        bottleneck_index = int(np.argmax(avg_waiting_time) + 1)

        daily_statistics = {
            "production": avg_production_day,
            "rejections": avg_rejections_day,
            "rejection_percentage": rejection_percentage,
            "fix_time": avg_fix_time_day,
            "delay_due_to_bottleneck": avg_delay_due_to_bottleneck_day,
            "accidents": avg_accidents_day,
            "occupancy_per_workstation": avg_occupancy_day,
            "downtime_per_workstation": avg_downtime_day,
            "idleTime_per_workstation": avg_idle_time,
            "waitingTime_per_workstation": avg_waiting_time,
            "bottleneck_data": [
                {"id": i + 1, "time": avg_waiting_time[i]} for i in range(NUM_WORKSTATIONS)
            ],
            "bottleneck_workstation": bottleneck_index
        }

        return daily_statistics

def run_simulation():
    daily_data = []

    for _ in range(NUM_DAYS):
        env = simpy.Environment()
        facility = ManufacturingFacility(env)
        env.process(facility.produce())
        env.run(until=SIM_TIME)

        daily_statistics = facility.get_daily_statistics()
        daily_data.append(daily_statistics)

    with open("daily_statistics.json", "w") as json_file:
        json.dump(daily_data, json_file, indent=4)

    print("Daily statistics saved to 'daily_statistics.json'")

if __name__ == "__main__":
    run_simulation()
