# Engine routes — Fuzzy, Monte Carlo, ML Prediction, NLP Analysis
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, Project, Simulation, NLPAnalysis, Task
from engines.fuzzy_engine import fuzzy_engine
from engines.monte_carlo_engine import monte_carlo_engine
from engines.ml_predictor import ml_predictor
from engines.nlp_analyzer import nlp_analyzer
from werkzeug.utils import secure_filename
import json
import os

engine_bp = Blueprint('engines', __name__)


# ---- Fuzzy Logic ----
@engine_bp.route('/fuzzy/<int:project_id>', methods=['POST'])
@jwt_required()
def run_fuzzy_analysis(project_id):
    """Run fuzzy logic risk assessment on project factors"""
    user_id = int(get_jwt_identity())
    project = Project.query.filter_by(id=project_id, owner_id=user_id).first_or_404()
    data = request.get_json()

    factors = data.get('factors', {})
    if not factors:
        return jsonify({'error': 'Risk factors are required'}), 400

    result = fuzzy_engine.assess_risk(factors)

    # Save simulation
    sim = Simulation(
        project_id=project_id,
        sim_type='fuzzy_logic',
        input_params=json.dumps(factors),
        results=json.dumps(result)
    )
    db.session.add(sim)

    # Update project risk score
    project.overall_risk_score = result['overall_risk_score']
    db.session.commit()

    return jsonify(result)


# ---- Monte Carlo ----
@engine_bp.route('/monte-carlo/<int:project_id>', methods=['POST'])
@jwt_required()
def run_monte_carlo(project_id):
    """Run Monte Carlo simulation on project tasks"""
    user_id = int(get_jwt_identity())
    project = Project.query.filter_by(id=project_id, owner_id=user_id).first_or_404()
    data = request.get_json()

    tasks = data.get('tasks', [])

    # If no tasks provided, use tasks from database
    if not tasks:
        db_tasks = Task.query.filter_by(project_id=project_id).all()
        tasks = [{
            'name': t.name,
            'optimistic': t.optimistic_est,
            'most_likely': t.most_likely_est,
            'pessimistic': t.pessimistic_est,
            'cost_per_day': 0
        } for t in db_tasks]

    if not tasks:
        return jsonify({'error': 'No tasks available for simulation'}), 400

    iterations = int(data.get('iterations', 5000))
    monte_carlo_engine.iterations = min(iterations, 10000)

    result = monte_carlo_engine.simulate_schedule(tasks)

    # Check deadline probability if deadline provided
    deadline = data.get('deadline_days')
    if deadline:
        prob = monte_carlo_engine.deadline_probability(tasks, float(deadline))
        result['deadline_analysis'] = {
            'target_days': float(deadline),
            'probability': prob,
            'status': 'likely' if prob >= 70 else ('risky' if prob >= 40 else 'unlikely')
        }

    # Save simulation
    sim = Simulation(
        project_id=project_id,
        sim_type='monte_carlo',
        input_params=json.dumps({'tasks': tasks, 'iterations': monte_carlo_engine.iterations}),
        results=json.dumps(result)
    )
    db.session.add(sim)
    db.session.commit()

    return jsonify(result)


# ---- ML Prediction ----
@engine_bp.route('/ml-predict/<int:project_id>', methods=['POST'])
@jwt_required()
def run_ml_prediction(project_id):
    """Run ML-based risk prediction"""
    user_id = int(get_jwt_identity())
    project = Project.query.filter_by(id=project_id, owner_id=user_id).first_or_404()
    data = request.get_json() or {}

    # Use project data if not provided
    project_data = {
        'team_size': data.get('team_size', project.team_size),
        'budget': data.get('budget', project.budget),
        'duration_months': data.get('duration_months', 6),
        'complexity': data.get('complexity', project.complexity),
        'team_experience': data.get('team_experience', 5),
        'technology_maturity': data.get('technology_maturity', 5),
        'requirement_stability': data.get('requirement_stability', 5),
        'methodology': data.get('methodology', project.methodology)
    }

    # Calculate duration from project dates if available
    if project.start_date and project.end_date:
        delta = (project.end_date - project.start_date).days
        project_data['duration_months'] = round(delta / 30, 1)

    result = ml_predictor.predict(project_data)

    # Save simulation
    sim = Simulation(
        project_id=project_id,
        sim_type='ml_prediction',
        input_params=json.dumps(project_data),
        results=json.dumps(result)
    )
    db.session.add(sim)

    # Update project risk score
    project.overall_risk_score = result['risk_score']
    db.session.commit()

    return jsonify(result)


# ---- NLP Analysis ----
@engine_bp.route('/nlp-analyze/<int:project_id>', methods=['POST'])
@jwt_required()
def run_nlp_analysis(project_id):
    """Analyze requirements document or text for risks"""
    user_id = int(get_jwt_identity())
    project = Project.query.filter_by(id=project_id, owner_id=user_id).first_or_404()

    text = None
    document_name = 'requirements.txt'

    # Check if file is uploaded
    if 'file' in request.files:
        file = request.files['file']
        if file.filename:
            document_name = secure_filename(file.filename)
            filepath = os.path.join('uploads', document_name)
            file.save(filepath)
            text = nlp_analyzer.extract_text_from_file(filepath)
            # Clean up
            try:
                os.remove(filepath)
            except Exception:
                pass
    
    # Or use text from request body
    if not text:
        data = request.get_json() if request.is_json else {}
        text = data.get('text', '') if data else ''
        document_name = data.get('document_name', 'requirements.txt') if data else document_name

    if not text or len(text.strip()) < 10:
        return jsonify({'error': 'No text provided for analysis. Upload a file or provide text.'}), 400

    result = nlp_analyzer.analyze_text(text, document_name)

    # Save analysis
    analysis = NLPAnalysis(
        project_id=project_id,
        document_name=document_name,
        original_text=text[:5000],  # Store first 5000 chars
        findings=json.dumps(result.get('findings', [])),
        risk_count=result.get('risk_count', 0),
        ambiguity_count=result.get('ambiguity_count', 0),
        incompleteness_count=result.get('incompleteness_count', 0),
        overall_quality_score=result.get('quality_score', 0)
    )
    db.session.add(analysis)
    db.session.commit()

    return jsonify(result)


# ---- Simulation History ----
@engine_bp.route('/simulations/<int:project_id>', methods=['GET'])
@jwt_required()
def get_simulations(project_id):
    user_id = int(get_jwt_identity())
    Project.query.filter_by(id=project_id, owner_id=user_id).first_or_404()

    sim_type = request.args.get('type')
    query = Simulation.query.filter_by(project_id=project_id)
    if sim_type:
        query = query.filter_by(sim_type=sim_type)

    sims = query.order_by(Simulation.created_at.desc()).limit(20).all()
    return jsonify([s.to_dict() for s in sims])


@engine_bp.route('/nlp-history/<int:project_id>', methods=['GET'])
@jwt_required()
def get_nlp_history(project_id):
    user_id = int(get_jwt_identity())
    Project.query.filter_by(id=project_id, owner_id=user_id).first_or_404()

    analyses = NLPAnalysis.query.filter_by(project_id=project_id) \
        .order_by(NLPAnalysis.created_at.desc()).limit(10).all()
    return jsonify([a.to_dict() for a in analyses])
