# Software Risk Assessment & Project Planning Tool
# Main Flask Application Entry Point

from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from dotenv import load_dotenv

# Load environment variables before importing Config
load_dotenv()

from config import Config
from models import db

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # Initialize extensions
    CORS(app, resources={r"/api/*": {"origins": "*"}})
    JWTManager(app)
    db.init_app(app)

    # Register blueprints
    from routes.auth_routes import auth_bp
    from routes.project_routes import project_bp
    from routes.risk_routes import risk_bp
    from routes.engine_routes import engine_bp

    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(project_bp, url_prefix='/api/projects')
    app.register_blueprint(risk_bp, url_prefix='/api/risks')
    app.register_blueprint(engine_bp, url_prefix='/api/engines')

    # Health check
    @app.route('/api/health')
    def health():
        return jsonify({'status': 'ok', 'app': 'Risk Assessment Tool', 'version': '1.0.0'})

    # Create database tables and seed demo user
    with app.app_context():
        db.create_all()
        from models import User
        if not User.query.filter_by(email='demo@srapp.dev').first():
            demo = User(name='Demo User', email='demo@srapp.dev', role='project_manager')
            demo.set_password('demo1234')
            db.session.add(demo)
            db.session.commit()

    return app

if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, port=5000)
