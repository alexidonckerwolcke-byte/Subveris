import requests
import json
import base64

USER_ID = "3c2085b7-de19-456a-8055-ffb22dd9cbb2"

# Generate token
payload = json.dumps({"sub": USER_ID})
b64 = base64.b64encode(payload.encode()).decode()
token = f"a.{b64}.b"

headers = {
    "Authorization": f"Bearer {token}",
    "Content-Type": "application/json",
}

print("📱 Upgrading user to family plan...")
print(f"Token: {token}\n")

# Upgrade to family plan
try:
    response = requests.post(
        "http://127.0.0.1:5000/api/user/upgrade-to-family",
        headers=headers,
        json={},
        timeout=5
    )
    print(f"✅ Upgrade Response: {response.status_code}")
    print(f"Body: {response.text}\n")
except Exception as e:
    print(f"❌ Error: {e}\n")

# Check premium status
print("Checking premium status...")
try:
    response = requests.get(
        "http://127.0.0.1:5000/api/user/premium-status",
        headers=headers,
        timeout=5
    )
    data = response.json()
    print(f"✅ Status Response: {response.status_code}")
    print(f"Premium Status:")
    print(json.dumps(data, indent=2))
except Exception as e:
    print(f"❌ Error: {e}")
