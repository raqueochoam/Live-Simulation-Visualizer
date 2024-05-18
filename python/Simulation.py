import simpy
import numpy as np
import random
import json

NUM_WORKSTATIONS = 6
NUM_BINS = 3
BIN_CAPACITY = 25
PROB_FAIL_MEAN = [0.22, 0.11, 0.17, 0.06, 0.08, 0.11]  # Cambiar esta línea para el examen, solo cambiar a las nuevas probabilidades
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
            # Get a bin of raw materials
            with self.supplier.get(BIN_CAPACITY * NUM_WORKSTATIONS) as bin:

                start_time = round(self.env.now, 2)  # Registra el tiempo
                yield self.env.timeout(np.random.normal(AVERAGE_WORK_TIME))

                # Check for accidents
                if np.random.random() < PROB_ACCIDENT:
                    self.total_accidents += 1
                    yield self.env.timeout(100)  # Simular una parada en la producción por 100 unidades de tiempo

                for i in [0, 1, 2, 3, 4, 5]:  # Cambie línea para el examen, usar un nuevo orden
                    workstation = self.workstations[i]  # cambie linea en el examen

                    # Get a workstation
                    with workstation.request() as req:
                        yield req

                        # Calculate probability of failure for this workstation
                        prob_fail = max(0, min(1, np.random.normal(PROB_FAIL_MEAN[i], PROB_FAIL_STD)))

                        # Check for workstation failure
                        if random.random() < prob_fail:
                            self.total_fix_time += round(np.random.exponential(AVERAGE_FIX_TIME), 2)
                            self.workstation_downtime[i] += round(np.random.exponential(AVERAGE_FIX_TIME), 2)
                            yield self.env.timeout(np.random.exponential(AVERAGE_FIX_TIME))
                            #print(f"Product stopped at workstation {i + 1} at time {round(self.env.now, 2)} due to failure")

                        # Simulate work at workstation
                        yield self.env.timeout(np.random.normal(AVERAGE_WORK_TIME))
                        self.workstation_occupancy[i] += 1

                        # Print message indicating product and workstation
                        end_time = round(self.env.now, 2)
                        #print(f"Product at workstation {i + 1} finished at time {end_time}, took {round(end_time - start_time, 2)} units")

                        # Track workstation status
                        if req.triggered:
                            self.workstation_waiting_time[i] += self.env.now - start_time
                        else:
                            self.workstation_idle_time[i] += self.env.now - start_time

                # Check for rejection
                if np.random.random() < PROB_REJECTION:
                    self.total_rejections += 1
                    continue  # Skip further processing if rejected

                # End of production process
                end_time = round(self.env.now, 2)
                self.production_count += 1
                self.total_delay_time += round((end_time - start_time), 2)
                #print(f"Product finished at time {end_time}, took {round(end_time - start_time, 2)} units")

def run_simulation():
    daily_data = []

    for _ in range(NUM_DAYS):
        # Setup and start the simulation
        env = simpy.Environment()
        facility = ManufacturingFacility(env)
        env.process(facility.produce())
        env.run(until=SIM_TIME)

        # Calculate averages and statistics for a day
        avg_production_day = round(facility.production_count, 2)
        avg_rejections_day = round(facility.total_rejections, 2)
        avg_fix_time_day = round(facility.total_fix_time, 2)
        avg_delay_due_to_bottleneck_day = round(facility.total_delay_time, 2)
        avg_accidents_day = round(facility.total_accidents, 2)

        # Calculate average occupancy and downtime for each workstation for a day
        avg_occupancy_day = [round(occ, 2) for occ in facility.workstation_occupancy]
        avg_downtime_day = [round(downtime, 2) for downtime in facility.workstation_downtime]

        # Calculate production rejection percentage
        rejection_percentage = round((avg_rejections_day / avg_production_day) * 100, 2)

        # Calculate average idle and waiting time for each workstation
        avg_idle_time = [round(idle, 2) for idle in facility.workstation_idle_time]
        avg_waiting_time = [round(waiting, 2) for waiting in facility.workstation_waiting_time]

        # Print daily statistics
        print("------------DAY EXPECTATIONS--------------")
        print(f"Average production for a day: {avg_production_day}")
        print(f"Average quality failures per day: {avg_rejections_day}")
        print(f"Average production rejection percentage: {rejection_percentage}%")
        print(f"Average fix time in all the plant for a day: {avg_fix_time_day}")
        print(f"Average delay due to bottleneck for a day: {avg_delay_due_to_bottleneck_day}")
        print(f"Average accidents per day: {avg_accidents_day}")
        print(f"Average occupancy for each workstation for a day: {avg_occupancy_day}")
        print(f"Average downtime for each workstation for a day: {avg_downtime_day}")
        print(f"Average idle time for each workstation for a day: {avg_idle_time}")
        print(f"Average waiting time for each workstation for a day: {avg_waiting_time}")

        # Bottleneck analysis
        bottleneck_index = np.argmax(avg_waiting_time)
        print(f"Bottleneck workstation: {bottleneck_index + 1} with average waiting time: {avg_waiting_time[bottleneck_index]}")

        # Gather daily statistics
        daily_statistics = {
            "production": facility.production_count,
            "rejections": facility.total_rejections,
            "rejection_percentage": round((facility.total_rejections / facility.production_count) * 100, 2),
            "fix_time": facility.total_fix_time,
            "delay_due_to_bottleneck": facility.total_delay_time,
            "accidents": facility.total_accidents,
            "occupancy_per_workstation": facility.workstation_occupancy,
            "downtime_per_workstation": facility.workstation_downtime,
            "idle_time_per_workstation": facility.workstation_idle_time,
            "waiting_time_per_workstation": facility.workstation_waiting_time
        }

        daily_data.append(daily_statistics)

    # Save daily data to a JSON file
    with open("daily_statistics.json", "w") as json_file:
        json.dump(daily_data, json_file, indent=4)

    print("Daily statistics saved to 'daily_statistics.json'")

if __name__ == "__main__":
    run_simulation()