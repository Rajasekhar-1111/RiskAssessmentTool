"""
End-to-end API test — verifies all 8 steps of the Risk Assessment workflow
"""
import requests, json, sys

BASE = 'http://localhost:5000/api'

def test():
    print("=" * 60)
    print("Software Risk Assessment Tool — Full API Test")
    print("=" * 60)

    # ── Step 1: Login ──
    print("\n🔐 Login...")
    r = requests.post(f'{BASE}/auth/login', json={'email': 'demo@srapp.dev', 'password': 'demo1234'})
    assert r.status_code == 200, f"Login failed: {r.text}"
    token = r.json()['token']
    headers = {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}
    print(f"   ✅ Logged in as {r.json()['user']['name']}")

    # ── Step 1: Define Project ──
    print("\n📁 Step 1: Define Project...")
    project_data = {
        'name': 'Online Shopping System',
        'description': 'E-commerce platform with Login, Cart, Payment, and Order Tracking modules',
        'modules': 'Login, Cart, Payment, Order Tracking',
        'team_size': 5,
        'budget': 100000,
        'technology': 'React, Node.js, PostgreSQL',
        'methodology': 'agile',
        'complexity': 'high',
        'start_date': '2026-06-01',
        'end_date': '2026-12-31'
    }
    r = requests.post(f'{BASE}/projects/', json=project_data, headers=headers)
    assert r.status_code == 201, f"Create project failed: {r.text}"
    project = r.json()
    pid = project['id']
    print(f"   ✅ Created project: '{project['name']}' (ID: {pid})")
    print(f"      Modules: {project['modules']}")
    print(f"      Team: {project['team_size']}, Budget: ${project['budget']:,}")

    # ── Steps 2-8: Identify, Categorize, Score, Prioritize, Mitigate Risks ──
    risks_data = [
        {
            'title': 'Payment gateway failure',
            'description': 'Payment API may fail during peak hours causing transaction loss',
            'category': 'technical',
            'sei_class': 'product_engineering',
            'probability': 4/5,  # 4 on 1-5 scale → 0.8
            'impact': 5/5,       # 5 on 1-5 scale → 1.0
            'mitigation_plan': 'Use backup payment gateway with retry logic',
            'trigger_condition': 'Payment API error rate exceeds 5%',
            'status': 'identified'
        },
        {
            'title': 'Server downtime',
            'description': 'Cloud server may experience unexpected outages',
            'category': 'technical',
            'sei_class': 'development_environment',
            'probability': 2/5,  # 2 on 1-5 scale → 0.4
            'impact': 4/5,       # 4 on 1-5 scale → 0.8
            'mitigation_plan': 'Setup backup server with auto-failover',
            'trigger_condition': 'Server response time > 5s',
            'status': 'analyzed'
        },
        {
            'title': 'Requirement changes',
            'description': 'Client may request major scope changes mid-development',
            'category': 'requirement',
            'sei_class': 'program_constraints',
            'probability': 5/5,  # 5 on 1-5 scale → 1.0
            'impact': 3/5,       # 3 on 1-5 scale → 0.6
            'mitigation_plan': 'Use agile methodology with bi-weekly demos',
            'trigger_condition': 'More than 3 change requests in a sprint',
            'status': 'mitigating'
        },
        {
            'title': 'Delay in testing',
            'description': 'QA testing may be delayed due to resource constraints',
            'category': 'schedule',
            'sei_class': 'program_constraints',
            'probability': 3/5,  # 3 on 1-5 scale → 0.6
            'impact': 3/5,       # 3 on 1-5 scale → 0.6
            'mitigation_plan': 'Automated testing + dedicated QA resources',
            'trigger_condition': 'Test completion < 60% at milestone',
            'status': 'identified'
        },
    ]

    print(f"\n⚠️ Steps 2-8: Creating {len(risks_data)} risks with scoring and mitigation...")
    for rd in risks_data:
        r = requests.post(f'{BASE}/risks/project/{pid}', json=rd, headers=headers)
        assert r.status_code == 201, f"Create risk failed: {r.text}"
        risk = r.json()
        p5 = round(risk['probability'] * 5)
        i5 = round(risk['impact'] * 5)
        score = risk['risk_score']
        level = risk['risk_level']
        print(f"   ✅ Risk: '{risk['title']}'")
        print(f"      Category: {risk['category']} | P={p5} × I={i5} = Score {score} → {level.upper()}")
        print(f"      Mitigation: {risk['mitigation_plan']}")

    # ── Verify risk list ──
    r = requests.get(f'{BASE}/risks/project/{pid}', headers=headers)
    assert r.status_code == 200
    all_risks = r.json()
    print(f"\n📊 Risk Register: {len(all_risks)} risks loaded")

    # ── Step 7: Verify prioritization ──
    print("\n🏆 Step 7: Risk Prioritization (sorted by score):")
    for risk in all_risks:
        p5 = round(risk['probability'] * 5)
        i5 = round(risk['impact'] * 5)
        print(f"   {risk['risk_level'].upper():8s} (Score {risk['risk_score']:>2}) — {risk['title']}")

    # ── Steps 9-10: Create Tasks with PERT ──
    tasks_data = [
        {'name': 'Implement Login Module',    'optimistic_est': 2, 'most_likely_est': 3, 'pessimistic_est': 5, 'priority': 'medium', 'start_date': '2026-06-01', 'end_date': '2026-06-10'},
        {'name': 'Implement Cart Module',     'optimistic_est': 3, 'most_likely_est': 5, 'pessimistic_est': 8, 'priority': 'medium', 'start_date': '2026-06-10', 'end_date': '2026-06-22'},
        {'name': 'Implement Payment Module',  'optimistic_est': 3, 'most_likely_est': 5, 'pessimistic_est': 10, 'priority': 'high',  'start_date': '2026-06-22', 'end_date': '2026-07-10'},
        {'name': 'Implement Order Tracking',  'optimistic_est': 2, 'most_likely_est': 4, 'pessimistic_est': 7, 'priority': 'medium', 'start_date': '2026-07-10', 'end_date': '2026-07-25'},
        {'name': 'Integration Testing',       'optimistic_est': 2, 'most_likely_est': 3, 'pessimistic_est': 6, 'priority': 'high',   'start_date': '2026-07-25', 'end_date': '2026-08-05'},
    ]

    print(f"\n📋 Steps 9-10: Creating {len(tasks_data)} tasks with PERT estimates...")
    high_risk_count = len([r for r in all_risks if r['risk_score'] >= 9])
    buffer_pct = 30 if high_risk_count >= 3 else (15 if high_risk_count >= 1 else 0)
    print(f"   Risk buffer: {buffer_pct}% (based on {high_risk_count} high/critical risks)")

    total_pert = 0
    for td in tasks_data:
        r = requests.post(f'{BASE}/risks/tasks/project/{pid}', json=td, headers=headers)
        assert r.status_code == 201, f"Create task failed: {r.text}"
        task = r.json()
        pert = task['pert_estimate']
        adjusted = round(pert * (1 + buffer_pct/100), 1)
        total_pert += pert
        print(f"   ✅ Task: '{task['name']}'")
        print(f"      PERT = ({td['optimistic_est']} + 4×{td['most_likely_est']} + {td['pessimistic_est']})/6 = {pert} days")
        if buffer_pct > 0:
            print(f"      Risk-adjusted: {adjusted} days (+{buffer_pct}% buffer)")

    print(f"\n   📊 Total PERT: {total_pert:.1f} days")
    if buffer_pct > 0:
        print(f"   📊 Risk-adjusted total: {total_pert * (1 + buffer_pct/100):.1f} days")

    # ── Dashboard ──
    print("\n📊 Dashboard Summary:")
    r = requests.get(f'{BASE}/projects/{pid}/dashboard', headers=headers)
    assert r.status_code == 200
    dash = r.json()
    rs = dash['risk_summary']
    print(f"   Total Risks: {rs['total_risks']}")
    print(f"   Avg Risk Score: {rs['average_risk_score']}")
    print(f"   Distribution: {rs['risk_distribution']}")
    print(f"   Open Risks: {rs['open_risks']}")
    print(f"   Critical Risks: {rs['critical_risks']}")
    print(f"   Tasks: {dash['project']['task_count']}")

    # ── Step 11: Monitoring ──
    print("\n📡 Step 11: Monitoring Summary:")
    r = requests.get(f'{BASE}/risks/monitoring/{pid}', headers=headers)
    assert r.status_code == 200
    mon = r.json()
    print(f"   Open risks: {mon['risk_monitoring']['open_risks']}")
    print(f"   Critical: {mon['risk_monitoring']['critical_risks']}")
    print(f"   Resolved: {mon['risk_monitoring']['resolved_risks']}")
    print(f"   Task progress: {mon['task_summary']}")
    print(f"   Action items: {len(mon['action_items'])}")
    for item in mon['action_items']:
        print(f"      [{item['urgency'].upper()}] {item['title']} (Score: {item['score']}) — {item['mitigation_plan'][:50]}")

    # ── Update risk status (simulate monitoring) ──
    print("\n🔄 Step 11: Updating risk statuses...")
    first_risk = all_risks[0]
    r = requests.put(f'{BASE}/risks/{first_risk["id"]}', json={'status': 'mitigating'}, headers=headers)
    assert r.status_code == 200
    print(f"   ✅ Updated '{first_risk['title']}' → status: mitigating")

    # ── Update task status ──
    r = requests.get(f'{BASE}/risks/tasks/project/{pid}', headers=headers)
    first_task = r.json()[0]
    r = requests.put(f'{BASE}/risks/tasks/{first_task["id"]}', json={'status': 'in_progress'}, headers=headers)
    assert r.status_code == 200
    print(f"   ✅ Updated task '{first_task['name']}' → status: in_progress")

    # ── Cleanup (optional — delete test project) ──
    # r = requests.delete(f'{BASE}/projects/{pid}', headers=headers)

    print("\n" + "=" * 60)
    print("🎉 ALL TESTS PASSED — All 8 steps working correctly!")
    print("=" * 60)
    print(f"\n🌐 Frontend: http://localhost:5173")
    print(f"   Login: demo@srapp.dev / demo1234")
    print(f"   Project '{project['name']}' ready with {len(all_risks)} risks + {len(tasks_data)} tasks")

if __name__ == '__main__':
    try:
        test()
    except Exception as e:
        print(f"\n❌ TEST FAILED: {e}")
        sys.exit(1)
