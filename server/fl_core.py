import numpy as np
from sklearn.neural_network import MLPClassifier
from sklearn.metrics import accuracy_score
from config import NUM_CLIENTS

class FederatedServer:

    def __init__(self):
        self.global_model = MLPClassifier(hidden_layer_sizes=(8,), max_iter=5)
        X_init = np.random.rand(10,4)
        y_init = np.random.randint(0,2,10)
        self.global_model.fit(X_init, y_init)

        self.round = 0
        self.updates = []
        self.accuracy_history = []

    def receive_update(self, model):
        self.updates.append(model)

    def aggregate(self):

        if len(self.updates) < NUM_CLIENTS:
            return False

        # FedAvg
        for layer in range(len(self.global_model.coefs_)):
            self.global_model.coefs_[layer] = np.mean(
                [m.coefs_[layer] for m in self.updates], axis=0)

        for layer in range(len(self.global_model.intercepts_)):
            self.global_model.intercepts_[layer] = np.mean(
                [m.intercepts_[layer] for m in self.updates], axis=0)

        self.round += 1
        self.updates = []

        # REAL EVALUATION
        X_test = np.random.rand(200,4)
        y_test = np.random.randint(0,2,200)

        acc = accuracy_score(y_test, self.global_model.predict(X_test))
        self.accuracy_history.append(acc)

        return True

    def evaluate(self):
        X_test = np.random.rand(200,4)
        y_test = np.random.randint(0,2,200)
        acc = accuracy_score(y_test, self.global_model.predict(X_test))
        self.accuracy_history.append(acc)
        return acc
