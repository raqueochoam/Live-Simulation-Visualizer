from flask import Flask, render_template, jsonify, send_from_directory
import subprocess
import os

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/run-simulation', methods=['POST'])
def run_simulation():
    try:
        result = subprocess.run(['python', 'python/Simulation.py'], capture_output=True, text=True)
        if result.returncode == 0:
            return jsonify({'success': True, 'output': result.stdout})
        else:
            return jsonify({'success': False, 'error': result.stderr})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/daily_statistics.json')
def get_daily_statistics():
    return send_from_directory(os.getcwd(), 'daily_statistics.json')

if __name__ == '__main__':
    app.run(debug=True)
