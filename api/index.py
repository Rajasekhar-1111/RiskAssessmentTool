"""
Vercel Python Serverless Function entry point.

Vercel requires `app`, `application`, or `handler` to be assigned
unconditionally at the TOP LEVEL of this file (not inside any block).
"""
import sys
import os
import logging

# ── Path setup ──────────────────────────────────────────────────────────────
backend_dir = os.path.join(os.path.dirname(__file__), '..', 'backend')
sys.path.insert(0, os.path.abspath(backend_dir))

# ── Load .env (local dev — on Vercel env vars are injected) ─────────────────
from dotenv import load_dotenv
load_dotenv(os.path.join(backend_dir, '.env'))

# ── Always create a base Flask app first (satisfies Vercel static scan) ─────
from flask import Flask, jsonify
app = Flask(__name__)

# ── Try to replace it with the real app ─────────────────────────────────────
_startup_error_msg = None
try:
    from app import create_app
    app = create_app()
except Exception as _exc:
    _startup_error_msg = str(_exc)
    logging.warning(f"[api/index.py] Startup error, using fallback app: {_exc}")

# ── If we're still on the fallback app, add health/catch-all routes ─────────
if _startup_error_msg:
    _msg = _startup_error_msg  # capture for closures

    @app.route('/api/health')
    def _health_error():
        return jsonify({'status': 'error', 'message': _msg}), 503

    @app.route('/api/<path:path>', methods=['GET', 'POST', 'PUT', 'DELETE', 'PATCH'])
    def _catch_all(path):
        return jsonify({'error': 'Service temporarily unavailable',
                        'detail': _msg}), 503
