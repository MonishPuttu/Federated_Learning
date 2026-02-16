from flask import Flask, jsonify
import time
from fl_core import FederatedServer
from config import SIMULATED_DELAY
import copy
from flask_cors import CORS

app = Flask(__name__)
CORS(app)
fl_server = FederatedServer()

@app.route("/update", methods=["POST"])
def update():

    time.sleep(SIMULATED_DELAY)

    model = fl_server.global_model
    fl_server.receive_update(copy.deepcopy(model))

    aggregated = fl_server.aggregate()

    response = {
        "round": fl_server.round,
        "aggregated": aggregated
    }

    return jsonify(response)

@app.route("/run_round", methods=["POST"])
def run_round():

    # Simulate 3 client updates
    for _ in range(3):
        fl_server.receive_update(copy.deepcopy(fl_server.global_model))

    aggregated = fl_server.aggregate()

    return jsonify({
        "success": True,
        "round": fl_server.round,
        "accuracy": fl_server.accuracy_history
    })


@app.route("/status", methods=["GET"])
def status():
    return jsonify({
        "round": fl_server.round,
        "accuracy": fl_server.accuracy_history
    })

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
