from flask import Flask, render_template, send_from_directory, jsonify
import os

app = Flask(__name__)

# Ruta para servir el archivo JSON
@app.route('/daily_statistics.json')
def daily_statistics():
    return send_from_directory(os.path.join(app.root_path, ''), 'daily_statistics.json')

# Ruta para servir la página principal
@app.route('/')
def index():
    return render_template('index.html')

if __name__ == '__main__':
    app.run(debug=True)
