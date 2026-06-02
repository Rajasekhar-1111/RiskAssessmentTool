import requests
import json

BASE_URL = "http://localhost:5000/api"

def print_step(title, res):
    print(f"\n--- {title} ---")
    print(f"Status: {res.status_code}")
    try:
        print(json.dumps(res.json(), indent=2))
    except:
        print(res.text)

def run_tests():
    print("Testing Risk Assessment Tool API...\n")
    
    # 1. Login
    login_data = {
        "email": "demo@srapp.dev",
        "password": "demo1234"
    }
    res = requests.post(f"{BASE_URL}/auth/login", json=login_data)
    print_step("Login", res)
    if res.status_code != 200:
        return
    
    token = res.json().get('token')
    headers = {"Authorization": f"Bearer {token}"}
    
    # 2. Create a Project
    project_data = {
        "name": "E-Commerce Payment Gateway Integration",
        "description": "Integrating Stripe and PayPal into our core shopping platform.",
        "modules": "Payment, Checkout, Security",
        "team_size": 4,
        "technology": "React, Python, Postgres",
        "methodology": "agile",
        "complexity": "high"
    }
    res = requests.post(f"{BASE_URL}/projects/", json=project_data, headers=headers)
    print_step("Create Project", res)
    if res.status_code != 201:
        return
        
    project_id = res.json().get('id')
    
    # 3. Add Risks
    risk1 = {
        "title": "Third-party API Rate Limiting",
        "description": "Stripe API might rate limit us during high traffic events like Black Friday.",
        "category": "technical",
        "probability": 0.6,
        "impact": 0.8,
        "mitigation_plan": "Implement exponential backoff and request queuing.",
        "contingency_plan": "Switch to fallback payment processor if limit is sustained."
    }
    res = requests.post(f"{BASE_URL}/risks/project/{project_id}", json=risk1, headers=headers)
    print_step("Add Risk 1", res)

    risk2 = {
        "title": "PCI DSS Compliance Delay",
        "description": "Security audit taking longer than expected.",
        "category": "schedule",
        "probability": 0.4,
        "impact": 0.9,
        "mitigation_plan": "Start compliance documentation 1 month early.",
        "contingency_plan": "Hire external compliance consultant."
    }
    res = requests.post(f"{BASE_URL}/risks/project/{project_id}", json=risk2, headers=headers)
    print_step("Add Risk 2", res)

    # 4. Add Tasks
    task1 = {
        "name": "Implement Stripe Webhooks",
        "description": "Set up webhook listener to handle asynchronous payment confirmations.",
        "optimistic_est": 2,
        "most_likely_est": 3,
        "pessimistic_est": 6
    }
    res = requests.post(f"{BASE_URL}/projects/{project_id}/tasks", json=task1, headers=headers)
    print_step("Add Task", res)
    
    # 5. Fetch Project Summary
    res = requests.get(f"{BASE_URL}/projects/{project_id}", headers=headers)
    print_step("Get Project Summary (Tasks & Risks Included)", res)

if __name__ == "__main__":
    run_tests()
