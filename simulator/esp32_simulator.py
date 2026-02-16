import requests
import time

SERVER_URL = "http://127.0.0.1:5000/update"

for i in range(10):
    response = requests.post(SERVER_URL, json={"client_id": i})
    print(response.json())
    time.sleep(1)
