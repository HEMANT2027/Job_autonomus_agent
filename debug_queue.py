import requests
import json

url = "http://localhost:8000/api/v1/apply/queue"

try:
    print(f"Sending GET to {url}")
    response = requests.get(url)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Error: {e}")
