"""Test all 4 analysis engines: Fuzzy, Monte Carlo, ML Prediction, NLP"""
import requests, json

BASE = 'http://localhost:5000/api'

def test():
    r = requests.post(f'{BASE}/auth/login', json={'email': 'demo@srapp.dev', 'password': 'demo1234'})
    token = r.json()['token']
    h = {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}
    pid = 2

    # 1. Fuzzy Logic
    print('=== Fuzzy Logic Engine ===')
    factors = {
        'requirement_stability': 4, 'team_experience': 7, 'technology_maturity': 6,
        'project_complexity': 8, 'schedule_pressure': 7, 'resource_availability': 5,
        'stakeholder_involvement': 6, 'requirement_clarity': 4
    }
    r = requests.post(f'{BASE}/engines/fuzzy/{pid}', json={'factors': factors}, headers=h)
    assert r.status_code == 200, f'Fuzzy failed: {r.text}'
    d = r.json()
    score = d['overall_risk_score']
    level = d['risk_level']
    recs = len(d.get('recommendations', []))
    print(f'  Risk Score: {score:.1f}/100 -> {level.upper()}')
    print(f'  Recommendations: {recs}')

    # 2. Monte Carlo
    print('\n=== Monte Carlo Simulation ===')
    mc_data = {
        'tasks': [
            {'name': 'Login', 'optimistic': 2, 'most_likely': 3, 'pessimistic': 5},
            {'name': 'Cart', 'optimistic': 3, 'most_likely': 5, 'pessimistic': 8},
            {'name': 'Payment', 'optimistic': 3, 'most_likely': 5, 'pessimistic': 10},
        ],
        'iterations': 2000,
        'deadline_days': 20
    }
    r = requests.post(f'{BASE}/engines/monte-carlo/{pid}', json=mc_data, headers=h)
    assert r.status_code == 200, f'Monte Carlo failed: {r.text}'
    d = r.json()
    s = d['schedule']
    print(f'  Mean Duration: {s["mean"]} days (std: {s["std_dev"]})')
    print(f'  80%% Confidence: {s["confidence_80"]["lower"]}-{s["confidence_80"]["upper"]} days')
    print(f'  P50: {s["percentiles"]["p50"]} | P90: {s["percentiles"]["p90"]}')
    if 'deadline_analysis' in d:
        da = d['deadline_analysis']
        print(f'  Deadline ({da["target_days"]}d): {da["probability"]}%% -> {da["status"]}')

    # 3. ML Prediction
    print('\n=== ML Risk Prediction ===')
    ml_data = {'team_size': 5, 'budget': 100000, 'duration_months': 7, 'complexity': 'high', 'team_experience': 6}
    r = requests.post(f'{BASE}/engines/ml-predict/{pid}', json=ml_data, headers=h)
    assert r.status_code == 200, f'ML Predict failed: {r.text}'
    d = r.json()
    print(f'  Risk Score: {d["risk_score"]:.1f}/100 -> {d["risk_level"].upper()}')
    print(f'  Risk Factors: {len(d.get("risk_factors", []))}')

    # 4. NLP Analyzer
    print('\n=== NLP Requirements Analyzer ===')
    nlp_text = (
        'The system shall support payment processing. Users should be able to add items to cart. '
        'The login module might need to handle multiple authentication methods. There could be some issues '
        'with scalability. Performance requirements are TBD. The deadline is aggressive.'
    )
    r = requests.post(f'{BASE}/engines/nlp-analyze/{pid}',
                       json={'text': nlp_text, 'document_name': 'test_requirements.txt'}, headers=h)
    assert r.status_code == 200, f'NLP failed: {r.text}'
    d = r.json()
    print(f'  Quality Score: {d.get("quality_score", 0):.1f}/100')
    print(f'  Risk indicators: {d.get("risk_count", 0)}')
    print(f'  Ambiguities: {d.get("ambiguity_count", 0)}')
    print(f'  Findings: {len(d.get("findings", []))}')

    print('\n' + '=' * 50)
    print('ALL 4 ENGINE TESTS PASSED!')
    print('=' * 50)

if __name__ == '__main__':
    try:
        test()
    except Exception as e:
        print(f'\nTEST FAILED: {e}')
        import sys; sys.exit(1)
