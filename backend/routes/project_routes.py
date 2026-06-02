# Project management routes
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, Project, Risk
from datetime import datetime
from engines.workflow_engine import workflow_engine

project_bp = Blueprint('projects', __name__)


@project_bp.route('/', methods=['GET'])
@jwt_required()
def get_projects():
    user_id = int(get_jwt_identity())
    projects = Project.query.filter_by(owner_id=user_id).order_by(Project.updated_at.desc()).all()
    return jsonify([p.to_dict() for p in projects])


@project_bp.route('/', methods=['POST'])
@jwt_required()
def create_project():
    user_id = int(get_jwt_identity())
    data = request.get_json()

    if not data or not data.get('name'):
        return jsonify({'error': 'Project name is required'}), 400

    project = Project(
        name=data['name'],
        description=data.get('description', ''),
        modules=data.get('modules', ''),
        owner_id=user_id,
        start_date=datetime.strptime(data['start_date'], '%Y-%m-%d').date() if data.get('start_date') else None,
        end_date=datetime.strptime(data['end_date'], '%Y-%m-%d').date() if data.get('end_date') else None,
        budget=float(data.get('budget', 0)),
        team_size=int(data.get('team_size', 1)),
        technology=data.get('technology', ''),
        methodology=data.get('methodology', 'agile'),
        complexity=data.get('complexity', 'medium'),
        status=data.get('status', 'planning')
    )

    db.session.add(project)
    db.session.commit()
    return jsonify(project.to_dict()), 201


@project_bp.route('/<int:project_id>', methods=['GET'])
@jwt_required()
def get_project(project_id):
    user_id = int(get_jwt_identity())
    project = Project.query.filter_by(id=project_id, owner_id=user_id).first_or_404()
    
    result = project.to_dict()
    result['risks'] = [r.to_dict() for r in project.risks]
    result['tasks'] = [t.to_dict() for t in project.tasks]
    return jsonify(result)


@project_bp.route('/<int:project_id>', methods=['PUT'])
@jwt_required()
def update_project(project_id):
    user_id = int(get_jwt_identity())
    project = Project.query.filter_by(id=project_id, owner_id=user_id).first_or_404()
    data = request.get_json()

    if data.get('name'):
        project.name = data['name']
    if 'description' in data:
        project.description = data['description']
    if 'modules' in data:
        project.modules = data['modules']
    if data.get('start_date'):
        project.start_date = datetime.strptime(data['start_date'], '%Y-%m-%d').date()
    if data.get('end_date'):
        project.end_date = datetime.strptime(data['end_date'], '%Y-%m-%d').date()
    if 'budget' in data:
        project.budget = float(data['budget'])
    if 'team_size' in data:
        project.team_size = int(data['team_size'])
    if data.get('technology'):
        project.technology = data['technology']
    if data.get('methodology'):
        project.methodology = data['methodology']
    if data.get('complexity'):
        project.complexity = data['complexity']
    if data.get('status'):
        project.status = data['status']

    db.session.commit()
    return jsonify(project.to_dict())


@project_bp.route('/<int:project_id>', methods=['DELETE'])
@jwt_required()
def delete_project(project_id):
    user_id = int(get_jwt_identity())
    project = Project.query.filter_by(id=project_id, owner_id=user_id).first_or_404()
    db.session.delete(project)
    db.session.commit()
    return jsonify({'message': 'Project deleted successfully'})


@project_bp.route('/<int:project_id>/dashboard', methods=['GET'])
@jwt_required()
def project_dashboard(project_id):
    user_id = int(get_jwt_identity())
    project = Project.query.filter_by(id=project_id, owner_id=user_id).first_or_404()

    risks = Risk.query.filter_by(project_id=project_id).all()

    # Risk distribution using display score (1-25 scale)
    risk_distribution = {'low': 0, 'medium': 0, 'high': 0, 'critical': 0}
    category_distribution = {}
    sei_distribution = {}

    def display_score(risk):
        p5 = round(risk.probability * 5) or 1
        i5 = round(risk.impact * 5) or 1
        return p5 * i5

    def display_level(risk):
        s = display_score(risk)
        if s >= 16: return 'critical'
        if s >= 9: return 'high'
        if s >= 4: return 'medium'
        return 'low'

    for risk in risks:
        level = display_level(risk)
        risk_distribution[level] = risk_distribution.get(level, 0) + 1
        if risk.category:
            category_distribution[risk.category] = category_distribution.get(risk.category, 0) + 1
        if risk.sei_class:
            sei_distribution[risk.sei_class] = sei_distribution.get(risk.sei_class, 0) + 1

    # Heat map data (5x5 probability vs impact matrix)
    heat_map = [[0]*5 for _ in range(5)]
    for risk in risks:
        p_bin = min(4, max(0, round(risk.probability * 5) - 1))
        i_bin = min(4, max(0, round(risk.impact * 5) - 1))
        heat_map[4 - p_bin][i_bin] += 1  # Flip for display (high prob at top)

    # Average risk score (1-25 scale)
    avg_risk = sum(display_score(r) for r in risks) / len(risks) if risks else 0

    return jsonify({
        'project': project.to_dict(),
        'risk_summary': {
            'total_risks': len(risks),
            'average_risk_score': round(avg_risk, 2),
            'risk_distribution': risk_distribution,
            'category_distribution': category_distribution,
            'sei_distribution': sei_distribution,
            'heat_map': heat_map,
            'open_risks': len([r for r in risks if r.status not in ['resolved', 'accepted']]),
            'critical_risks': len([r for r in risks if display_level(r) == 'critical']),
        },
        'top_risks': [r.to_dict() for r in sorted(risks, key=lambda x: display_score(x), reverse=True)[:5]]
    })

@project_bp.route('/<int:project_id>/auto-generate', methods=['POST'])
@jwt_required()
def auto_generate_workflow(project_id):
    """Uses LLM to automatically generate risks and tasks for the project"""
    user_id = int(get_jwt_identity())
    project = Project.query.filter_by(id=project_id, owner_id=user_id).first_or_404()
    
    # 1. Generate workflow using LLM
    data = workflow_engine.generate_project_workflow(project)
    
    if "error" in data:
        return jsonify({"error": data["error"]}), 500
        
    # 2. Save generated risks and tasks to the database
    success, message = workflow_engine.apply_workflow_to_database(project_id, data)
    
    if not success:
        return jsonify({"error": message}), 500
        
    # 3. Return updated project details
    project = Project.query.get(project_id)
    result = project.to_dict()
    result['risks'] = [r.to_dict() for r in project.risks]
    result['tasks'] = [t.to_dict() for t in project.tasks]
    
    return jsonify({
        "message": "Workflow successfully generated and applied.",
        "project": result
    }), 200

