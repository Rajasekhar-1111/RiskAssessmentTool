from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime
import json

db = SQLAlchemy()


class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    role = db.Column(db.String(20), default='project_manager')  # admin, project_manager, team_member
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    projects = db.relationship('Project', backref='owner', lazy=True)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'email': self.email,
            'role': self.role,
            'created_at': self.created_at.isoformat()
        }


class Project(db.Model):
    __tablename__ = 'projects'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    modules = db.Column(db.Text, default='')  # comma-separated list of modules e.g. Login, Cart, Payment
    owner_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    start_date = db.Column(db.Date)
    end_date = db.Column(db.Date)
    budget = db.Column(db.Float, default=0)
    team_size = db.Column(db.Integer, default=1)
    technology = db.Column(db.String(200))
    methodology = db.Column(db.String(50), default='agile')  # agile, waterfall, hybrid
    complexity = db.Column(db.String(20), default='medium')  # low, medium, high, very_high
    status = db.Column(db.String(20), default='planning')  # planning, active, completed, on_hold
    overall_risk_score = db.Column(db.Float, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    risks = db.relationship('Risk', backref='project', lazy=True, cascade='all, delete-orphan')
    tasks = db.relationship('Task', backref='project', lazy=True, cascade='all, delete-orphan')
    simulations = db.relationship('Simulation', backref='project', lazy=True, cascade='all, delete-orphan')
    nlp_analyses = db.relationship('NLPAnalysis', backref='project', lazy=True, cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'modules': self.modules or '',
            'owner_id': self.owner_id,
            'owner_name': self.owner.name if self.owner else None,
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'end_date': self.end_date.isoformat() if self.end_date else None,
            'budget': self.budget,
            'team_size': self.team_size,
            'technology': self.technology,
            'methodology': self.methodology,
            'complexity': self.complexity,
            'status': self.status,
            'overall_risk_score': self.overall_risk_score,
            'risk_count': len(self.risks),
            'task_count': len(self.tasks),
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }


class Risk(db.Model):
    __tablename__ = 'risks'
    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, db.ForeignKey('projects.id'), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    category = db.Column(db.String(50))  # technical, schedule, cost, resource, quality, external
    sei_class = db.Column(db.String(50))  # product_engineering, development_environment, program_constraints
    sei_element = db.Column(db.String(100))
    probability = db.Column(db.Float, default=0.5)  # 0.0 - 1.0
    impact = db.Column(db.Float, default=0.5)  # 0.0 - 1.0
    risk_score = db.Column(db.Float, default=0)  # computed
    risk_level = db.Column(db.String(20))  # low, medium, high, critical
    status = db.Column(db.String(20), default='identified')  # identified, analyzed, mitigating, resolved, accepted
    mitigation_plan = db.Column(db.Text)
    contingency_plan = db.Column(db.Text)
    owner_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    trigger_condition = db.Column(db.String(300))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    owner = db.relationship('User', backref='owned_risks')

    def compute_risk_score(self):
        """Compute risk score using 1-5 probability × 1-5 impact scale.
        
        Values are stored as 0.0-1.0 (probability/5 and impact/5) and
        displayed as 1-25 on the UI (rounded back to 1-5 scale).
        The stored risk_score is the 1-25 value for easy display.
        """
        # Convert 0-1 stored values back to 1-5 scale, then multiply
        p5 = round(self.probability * 5) or 1  # 1-5
        i5 = round(self.impact * 5) or 1        # 1-5
        self.risk_score = p5 * i5               # 1-25 scale
        if self.risk_score >= 16:
            self.risk_level = 'critical'
        elif self.risk_score >= 9:
            self.risk_level = 'high'
        elif self.risk_score >= 4:
            self.risk_level = 'medium'
        else:
            self.risk_level = 'low'

    def to_dict(self):
        return {
            'id': self.id,
            'project_id': self.project_id,
            'title': self.title,
            'description': self.description,
            'category': self.category,
            'sei_class': self.sei_class,
            'sei_element': self.sei_element,
            'probability': self.probability,
            'impact': self.impact,
            'risk_score': self.risk_score,
            'risk_level': self.risk_level,
            'status': self.status,
            'mitigation_plan': self.mitigation_plan,
            'contingency_plan': self.contingency_plan,
            'owner_id': self.owner_id,
            'owner_name': self.owner.name if self.owner else None,
            'trigger_condition': self.trigger_condition,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }


class Task(db.Model):
    __tablename__ = 'tasks'
    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, db.ForeignKey('projects.id'), nullable=False)
    name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    optimistic_est = db.Column(db.Float, default=1)  # days
    most_likely_est = db.Column(db.Float, default=3)  # days
    pessimistic_est = db.Column(db.Float, default=7)  # days
    pert_estimate = db.Column(db.Float)  # computed PERT
    assigned_to = db.Column(db.Integer, db.ForeignKey('users.id'))
    status = db.Column(db.String(20), default='pending')  # pending, in_progress, completed, blocked
    priority = db.Column(db.String(20), default='medium')
    start_date = db.Column(db.Date)
    end_date = db.Column(db.Date)
    risk_score = db.Column(db.Float, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    assignee = db.relationship('User', backref='assigned_tasks')

    def compute_pert(self):
        """PERT estimate = (O + 4M + P) / 6"""
        self.pert_estimate = round(
            (self.optimistic_est + 4 * self.most_likely_est + self.pessimistic_est) / 6, 2
        )

    def to_dict(self):
        return {
            'id': self.id,
            'project_id': self.project_id,
            'name': self.name,
            'description': self.description,
            'optimistic_est': self.optimistic_est,
            'most_likely_est': self.most_likely_est,
            'pessimistic_est': self.pessimistic_est,
            'pert_estimate': self.pert_estimate,
            'assigned_to': self.assigned_to,
            'assignee_name': self.assignee.name if self.assignee else None,
            'status': self.status,
            'priority': self.priority,
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'end_date': self.end_date.isoformat() if self.end_date else None,
            'risk_score': self.risk_score,
            'created_at': self.created_at.isoformat()
        }


class Simulation(db.Model):
    __tablename__ = 'simulations'
    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, db.ForeignKey('projects.id'), nullable=False)
    sim_type = db.Column(db.String(30))  # monte_carlo, fuzzy_logic, ml_prediction
    input_params = db.Column(db.Text)  # JSON
    results = db.Column(db.Text)  # JSON
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def get_input_params(self):
        return json.loads(self.input_params) if self.input_params else {}

    def get_results(self):
        return json.loads(self.results) if self.results else {}

    def to_dict(self):
        return {
            'id': self.id,
            'project_id': self.project_id,
            'sim_type': self.sim_type,
            'input_params': self.get_input_params(),
            'results': self.get_results(),
            'created_at': self.created_at.isoformat()
        }


class NLPAnalysis(db.Model):
    __tablename__ = 'nlp_analyses'
    id = db.Column(db.Integer, primary_key=True)
    project_id = db.Column(db.Integer, db.ForeignKey('projects.id'), nullable=False)
    document_name = db.Column(db.String(200))
    original_text = db.Column(db.Text)
    findings = db.Column(db.Text)  # JSON
    risk_count = db.Column(db.Integer, default=0)
    ambiguity_count = db.Column(db.Integer, default=0)
    incompleteness_count = db.Column(db.Integer, default=0)
    overall_quality_score = db.Column(db.Float, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def get_findings(self):
        return json.loads(self.findings) if self.findings else []

    def to_dict(self):
        return {
            'id': self.id,
            'project_id': self.project_id,
            'document_name': self.document_name,
            'findings': self.get_findings(),
            'risk_count': self.risk_count,
            'ambiguity_count': self.ambiguity_count,
            'incompleteness_count': self.incompleteness_count,
            'overall_quality_score': self.overall_quality_score,
            'created_at': self.created_at.isoformat()
        }
