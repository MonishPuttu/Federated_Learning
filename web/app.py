from flask import Flask, render_template
import requests

app = Flask(__name__, template_folder="templates", static_folder="static")

FL_SERVER = "http://127.0.0.1:5000/status"

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/api/status")
def status():
    return requests.get(FL_SERVER).json()

if __name__ == "__main__":
    app.run(port=8000)
