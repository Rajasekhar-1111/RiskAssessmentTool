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

    # Debug route — shows DB connection status (remove in production later)
    @app.route('/api/debug')
    def debug():
        import os
        db_url = os.environ.get('DATABASE_URL', 'NOT SET')
        # Mask password in output
        masked = db_url[:30] + '***' + db_url[-20:] if len(db_url) > 50 else db_url
        result = {'db_url_masked': masked, 'db_connected': False, 'error': None}
        try:
            with app.app_context():
                db.engine.connect()
            result['db_connected'] = True
        except Exception as e:
            result['error'] = str(e)
        return jsonify(result)

    # Create database tables and seed demo user
    # Wrapped in try/except so DB connection failures don't crash the
    # Vercel serverless function on cold start.
    # Tables are created by supabase/schema.sql; this is just a safety net.
    try:
        with app.app_context():
            db.create_all()
            from models import User
            if not User.query.filter_by(email='demo@srapp.dev').first():
                demo = User(name='Demo User', email='demo@srapp.dev', role='project_manager')
                demo.set_password('demo1234')
                db.session.add(demo)
                db.session.commit()
    except Exception as e:
        import logging
        logging.warning(f"DB initialization skipped: {e}")

    return app

if __name__ == '__main__':
    app = create_app()
    app.run(host="0.0.0.0", port=5000, debug=True)
