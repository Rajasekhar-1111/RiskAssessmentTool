# Risk management routes
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, Risk, Project, Task, Simulation
from datetime import datetime
import json
import os

risk_bp = Blueprint('risks', __name__)

# SEI Risk Taxonomy questionnaire data
SEI_TAXONOMY = {
    'product_engineering': {
        'label': 'Product Engineering',
        'description': 'Risks associated with technical aspects of the work',
        'elements': {
            'requirements': {
                'label': 'Requirements',
                'questions': [
                    'Are requirements stable and well-defined?',
                    'Is there a formal requirements change control process?',
                    'Are requirements testable and verifiable?',
                    'Have all stakeholders agreed on the requirements?',
                    'Are there potential conflicting requirements?'
                ]
            },
            'design': {
                'label': 'Design',
                'questions': [
                    'Is the system architecture well-defined?',
                    'Are there design dependencies on unproven technologies?',
                    'Has the design been reviewed by peers?',
                    'Are performance requirements addressed in the design?',
                    'Is the design modular and maintainable?'
                ]
            },
            'code_and_testing': {
                'label': 'Code & Unit Testing',
                'questions': [
                    'Is the code complexity manageable?',
                    'Are coding standards defined and followed?',
                    'Is there adequate unit test coverage?',
                    'Are code reviews conducted regularly?',
                    'Is there automated testing in place?'
                ]
            },
            'integration': {
                'label': 'Integration & Testing',
                'questions': [
                    'Is the integration plan well-defined?',
                    'Are integration test environments available?',
                    'Are third-party component interfaces defined?',
                    'Is system testing planned adequately?',
                    'Has acceptance testing been defined?'
                ]
            }
        }
    },
    'development_environment': {
        'label': 'Development Environment',
        'description': 'Risks with methods, procedures, and tools',
        'elements': {
            'development_process': {
                'label': 'Development Process',
                'questions': [
                    'Is the development methodology well-suited?',
                    'Are process standards defined and followed?',
                    'Is there version control in place?',
                    'Are CI/CD pipelines established?',
                    'Is the development process scalable?'
                ]
            },
            'development_system': {
                'label': 'Development System',
                'questions': [
                    'Are development tools adequate and available?',
                    'Is the development environment stable?',
                    'Are tool licenses current and available?',
                    'Is there adequate hardware for development?',
                    'Are debugging/profiling tools available?'
                ]
            },
            'management': {
                'label': 'Management Process',
                'questions': [
                    'Is project planning adequate?',
                    'Are milestones realistic and achievable?',
                    'Is progress tracked regularly?',
                    'Are risks being actively monitored?',
                    'Is there a defined escalation process?'
                ]
            }
        }
    },
    'program_constraints': {
        'label': 'Program Constraints',
        'description': 'Contractual, organizational, and external factors',
        'elements': {
            'resources': {
                'label': 'Resources',
                'questions': [
                    'Is the budget adequate for the project scope?',
                    'Are skilled staff available in sufficient numbers?',
                    'Is there staff turnover risk?',
                    'Are facilities and infrastructure adequate?',
                    'Is there training budget for new technologies?'
                ]
            },
            'schedule': {
                'label': 'Schedule',
                'questions': [
                    'Is the project timeline realistic?',
                    'Are there hard deadline constraints?',
                    'Is there buffer time for unexpected issues?',
                    'Are dependencies on external deliverables managed?',
                    'Is parallel development feasible?'
                ]
            },
            'stakeholders': {
                'label': 'Stakeholders & Interfaces',
                'questions': [
                    'Are stakeholder expectations clearly defined?',
                    'Is there regular communication with stakeholders?',
                    'Are external dependencies well-managed?',
                    'Is there vendor/contractor risk?',
                    'Are regulatory/compliance requirements clear?'
                ]
            }
        }
    }
}


@risk_bp.route('/taxonomy', methods=['GET'])
@jwt_required()
def get_taxonomy():
    """Return the SEI Risk Taxonomy questionnaire structure"""
    return jsonify(SEI_TAXONOMY)


@risk_bp.route('/suggest-mitigation', methods=['POST'])
@jwt_required()
def suggest_mitigation():
    """Suggests a mitigation plan and trigger condition based on a risk's title, description, and category"""
    data = request.get_json() or {}
    title = data.get('title', '')
    description = data.get('description', '')
    category = data.get('category', 'technical')
    
    if not title:
        return jsonify({'error': 'Risk title is required for suggestions'}), 400
        
    from engines.workflow_engine import workflow_engine
    res_data = workflow_engine.get_single_mitigation_suggestion(title, description, category)
    return jsonify(res_data)


@risk_bp.route('/project/<int:project_id>', methods=['GET'])
@jwt_required()
def get_risks(project_id):
    user_id = int(get_jwt_identity())
    Project.query.filter_by(id=project_id, owner_id=user_id).first_or_404()
    
    risks = Risk.query.filter_by(project_id=project_id).order_by(Risk.risk_score.desc()).all()
    return jsonify([r.to_dict() for r in risks])


@risk_bp.route('/project/<int:project_id>', methods=['POST'])
@jwt_required()
def create_risk(project_id):
    user_id = int(get_jwt_identity())
    project = Project.query.filter_by(id=project_id, owner_id=user_id).first_or_404()
    data = request.get_json()

    if not data or not data.get('title'):
        return jsonify({'error': 'Risk title is required'}), 400

    mitigation_plan = data.get('mitigation_plan', '')
    trigger_condition = data.get('trigger_condition', '')

    from engines.workflow_engine import workflow_engine
    if not mitigation_plan or not trigger_condition:
        suggestion = workflow_engine.get_single_mitigation_suggestion(
            data['title'],
            data.get('description', ''),
            data.get('category', 'technical')
        )
        if not mitigation_plan:
            mitigation_plan = suggestion['mitigation_plan']
        if not trigger_condition:
            trigger_condition = suggestion['trigger_condition']

    risk = Risk(
        project_id=project_id,
        title=data['title'],
        description=data.get('description', ''),
        category=data.get('category', 'technical'),
        sei_class=data.get('sei_class', ''),
        sei_element=data.get('sei_element', ''),
        probability=float(data.get('probability', 0.5)),
        impact=float(data.get('impact', 0.5)),
        status=data.get('status', 'identified'),
        mitigation_plan=mitigation_plan,
        contingency_plan=data.get('contingency_plan', ''),
        owner_id=data.get('owner_id') or user_id,
        trigger_condition=trigger_condition
    )
    risk.compute_risk_score()

    db.session.add(risk)

    # Update project overall risk score
    all_risks = Risk.query.filter_by(project_id=project_id).all()
    all_scores = [r.risk_score for r in all_risks] + [risk.risk_score]
    project.overall_risk_score = round(sum(all_scores) / len(all_scores), 2)

    db.session.commit()
    return jsonify(risk.to_dict()), 201


@risk_bp.route('/<int:risk_id>', methods=['PUT'])
@jwt_required()
def update_risk(risk_id):
    risk = Risk.query.get_or_404(risk_id)
    data = request.get_json()

    if data.get('title'):
        risk.title = data['title']
    if 'description' in data:
        risk.description = data['description']
    if data.get('category'):
        risk.category = data['category']
    if data.get('sei_class'):
        risk.sei_class = data['sei_class']
    if data.get('sei_element'):
        risk.sei_element = data['sei_element']
    if 'probability' in data:
        risk.probability = float(data['probability'])
    if 'impact' in data:
        risk.impact = float(data['impact'])
    if data.get('status'):
        risk.status = data['status']
    if 'mitigation_plan' in data:
        risk.mitigation_plan = data['mitigation_plan']
    if 'contingency_plan' in data:
        risk.contingency_plan = data['contingency_plan']
    if data.get('trigger_condition'):
        risk.trigger_condition = data['trigger_condition']

    risk.compute_risk_score()
    db.session.commit()
    return jsonify(risk.to_dict())


@risk_bp.route('/<int:risk_id>', methods=['DELETE'])
@jwt_required()
def delete_risk(risk_id):
    risk = Risk.query.get_or_404(risk_id)
    db.session.delete(risk)
    db.session.commit()
    return jsonify({'message': 'Risk deleted successfully'})


# ---- Task routes ----
@risk_bp.route('/tasks/project/<int:project_id>', methods=['GET'])
@jwt_required()
def get_tasks(project_id):
    user_id = int(get_jwt_identity())
    Project.query.filter_by(id=project_id, owner_id=user_id).first_or_404()
    
    tasks = Task.query.filter_by(project_id=project_id).all()
    return jsonify([t.to_dict() for t in tasks])


@risk_bp.route('/tasks/project/<int:project_id>', methods=['POST'])
@jwt_required()
def create_task(project_id):
    user_id = int(get_jwt_identity())
    Project.query.filter_by(id=project_id, owner_id=user_id).first_or_404()
    data = request.get_json()

    start_date = None
    end_date = None
    if data.get('start_date'):
        try:
            start_date = datetime.strptime(data['start_date'], '%Y-%m-%d').date()
        except ValueError:
            pass
    if data.get('end_date'):
        try:
            end_date = datetime.strptime(data['end_date'], '%Y-%m-%d').date()
        except ValueError:
            pass

    task = Task(
        project_id=project_id,
        name=data.get('name', 'Untitled Task'),
        description=data.get('description', ''),
        optimistic_est=float(data.get('optimistic_est', 1)),
        most_likely_est=float(data.get('most_likely_est', 3)),
        pessimistic_est=float(data.get('pessimistic_est', 7)),
        priority=data.get('priority', 'medium'),
        status=data.get('status', 'pending'),
        start_date=start_date,
        end_date=end_date,
        risk_score=float(data.get('risk_score', 0))
    )
    task.compute_pert()

    db.session.add(task)
    db.session.commit()
    return jsonify(task.to_dict()), 201


@risk_bp.route('/tasks/<int:task_id>', methods=['DELETE'])
@jwt_required()
def delete_task(task_id):
    task = Task.query.get_or_404(task_id)
    db.session.delete(task)
    db.session.commit()
    return jsonify({'message': 'Task deleted'})


@risk_bp.route('/tasks/<int:task_id>', methods=['PUT'])
@jwt_required()
def update_task(task_id):
    """Update task — status, priority, dates, estimates"""
    task = Task.query.get_or_404(task_id)
    data = request.get_json()

    if data.get('name'):
        task.name = data['name']
    if 'description' in data:
        task.description = data['description']
    if data.get('status'):
        task.status = data['status']
    if data.get('priority'):
        task.priority = data['priority']
    if 'optimistic_est' in data:
        task.optimistic_est = float(data['optimistic_est'])
    if 'most_likely_est' in data:
        task.most_likely_est = float(data['most_likely_est'])
    if 'pessimistic_est' in data:
        task.pessimistic_est = float(data['pessimistic_est'])
    if data.get('start_date'):
        try:
            task.start_date = datetime.strptime(data['start_date'], '%Y-%m-%d').date()
        except ValueError:
            pass
    if data.get('end_date'):
        try:
            task.end_date = datetime.strptime(data['end_date'], '%Y-%m-%d').date()
        except ValueError:
            pass
    if 'risk_score' in data:
        task.risk_score = float(data['risk_score'])

    task.compute_pert()
    db.session.commit()
    return jsonify(task.to_dict())


@risk_bp.route('/monitoring/<int:project_id>', methods=['GET'])
@jwt_required()
def get_monitoring_summary(project_id):
    """Step 11: Continuous monitoring — risk status overview"""
    user_id = int(get_jwt_identity())
    Project.query.filter_by(id=project_id, owner_id=user_id).first_or_404()

    risks = Risk.query.filter_by(project_id=project_id).order_by(Risk.updated_at.desc()).all()
    tasks = Task.query.filter_by(project_id=project_id).all()

    def display_score(risk):
        p5 = round(risk.probability * 5) or 1
        i5 = round(risk.impact * 5) or 1
        return p5 * i5

    open_risks = [r for r in risks if r.status not in ['resolved', 'accepted']]
    resolved_risks = [r for r in risks if r.status == 'resolved']
    critical_risks = [r for r in risks if display_score(r) >= 16]
    high_risks = [r for r in risks if 9 <= display_score(r) < 16]

    task_summary = {
        'total': len(tasks),
        'pending': len([t for t in tasks if t.status == 'pending']),
        'in_progress': len([t for t in tasks if t.status == 'in_progress']),
        'completed': len([t for t in tasks if t.status == 'completed']),
        'blocked': len([t for t in tasks if t.status == 'blocked']),
    }

    return jsonify({
        'risk_monitoring': {
            'total_risks': len(risks),
            'open_risks': len(open_risks),
            'resolved_risks': len(resolved_risks),
            'critical_risks': len(critical_risks),
            'high_risks': len(high_risks),
            'recently_updated': [r.to_dict() for r in risks[:5]],
        },
        'task_summary': task_summary,
        'action_items': [
            {
                'risk_id': r.id,
                'title': r.title,
                'score': display_score(r),
                'status': r.status,
                'mitigation_plan': r.mitigation_plan or 'No mitigation plan defined',
                'urgency': 'immediate' if display_score(r) >= 16 else 'high' if display_score(r) >= 9 else 'normal'
            }
            for r in open_risks
            if display_score(r) >= 4
        ]
    })

