import requests
import json

BASE_URL = "http://localhost:8000/api/v1/apply"

endpoints = [
    ("/queue", "GET"),
    ("/batch/status", "GET"),
]

for path, method in endpoints:
    url = f"{BASE_URL}{path}"
    try:
        print(f"Testing {method} {url}")
        if method == "GET":
            response = requests.get(url)
        else:
            response = requests.post(url)
        
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text[:200]}...")
    except Exception as e:
        print(f"Error testing {url}: {e}")
