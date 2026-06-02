import os
import json
from datetime import datetime, timedelta, date
import google.generativeai as genai
from models import db, Risk, Task, Project

# Configure Gemini API
# If GEMINI_API_KEY is not in environment, this engine will gracefully fail
genai.configure(api_key=os.environ.get("GEMINI_API_KEY"))

class WorkflowEngine:
    """
    AI Workflow Engine utilizing Google Gemini API.
    Takes Step 1 Project Definitions and manually added risks, and generates task schedules.
    """
    
    def __init__(self):
        # We use gemini-1.5-flash as it is fast, cost-effective, and great for structured output.
        try:
            self.model = genai.GenerativeModel('gemini-1.5-flash')
        except Exception:
            self.model = None

    def generate_project_workflow(self, project):
        """
        Generates task WBS adjustments based on project modules and existing risks.
        Returns a structured dictionary of the generated data.
        """
        # Fallback to local heuristic generator if Gemini is not configured or fails
        if not self.model or not os.environ.get("GEMINI_API_KEY"):
            return self.generate_project_workflow_heuristic(project)
            
        existing_risks = Risk.query.filter_by(project_id=project.id).all()
        risks_summary = "\n".join([f"- {r.title} (Category: {r.category}, Level: {r.risk_level})" for r in existing_risks])

        prompt = f"""
You are an expert Software Project Manager and Risk Assessor.
Analyze the following project details, its modules, and its manually identified risks. Generate a structured project plan (WBS) consisting of tasks.

Project Title: {project.name}
Description: {project.description}
Modules: {project.modules}
Team Size: {project.team_size}
Methodology: {project.methodology}
Complexity: {project.complexity}

Existing Project Risks:
{risks_summary}

Respond ONLY with a valid JSON object matching the following structure exactly. Do not include markdown formatting or backticks.

{{
    "tasks": [
        {{
            "name": "Task name (e.g. Design secure auth flow)",
            "description": "Detailed task description",
            "optimistic_est": 1,
            "most_likely_est": 2,
            "pessimistic_est": 4,
            "priority": "high | medium | low",
            "phase": "requirements | development | testing | mitigation"
        }}
        // Generate a complete Work Breakdown Structure (WBS) schedule. 
        // Ensure you generate:
        // - At least 1 requirements/design task, 1 development task, and 1 testing/QA task for EACH module listed in the project modules.
        // - Specific mitigation tasks (phase = "mitigation") to address the high or critical project risks listed above.
    ]
}}
"""
        try:
            response = self.model.generate_content(prompt)
            # Clean response text if it contains markdown JSON blocks
            text = response.text.strip()
            if text.startswith("```json"):
                text = text[7:]
            if text.endswith("```"):
                text = text[:-3]
                
            data = json.loads(text.strip())
            return data
            
        except Exception:
            # If AI service fails, fallback to local heuristic
            return self.generate_project_workflow_heuristic(project)

    def generate_project_workflow_heuristic(self, project):
        """
        Generates WBS Tasks using a rule-based heuristic algorithm
        tailored to the project's modules and existing manually added risks.
        """
        # Parse modules
        modules_list = [m.strip() for m in project.modules.split(',') if m.strip()]
        if not modules_list:
            modules_list = ["Core Platform"]

        tasks = []

        # Common modules knowledge base
        common_kb = {
            'login': [
                {'name': 'Design secure Login user flow & DB schema', 'description': 'Map auth endpoints and secure token structures.', 'optimistic_est': 1, 'most_likely_est': 2, 'pessimistic_est': 4, 'priority': 'high', 'phase': 'requirements'},
                {'name': 'Implement Login JWT and password hashing', 'description': 'Develop sign-in/up routes, JWT issuing, and encryption logic.', 'optimistic_est': 2, 'most_likely_est': 4, 'pessimistic_est': 7, 'priority': 'high', 'phase': 'development'},
                {'name': 'Conduct Login penetration & security testing', 'description': 'Verify rate limiting and test auth routes for vulnerabilities.', 'optimistic_est': 1, 'most_likely_est': 2, 'pessimistic_est': 4, 'priority': 'medium', 'phase': 'testing'}
            ],
            'auth': [
                {'name': 'Design authorization roles & policies', 'description': 'Establish RBAC policies and permission gates.', 'optimistic_est': 1, 'most_likely_est': 2, 'pessimistic_est': 3, 'priority': 'high', 'phase': 'requirements'},
                {'name': 'Implement role-based route protection', 'description': 'Add middleware to protect admin and user-level API endpoints.', 'optimistic_est': 1, 'most_likely_est': 3, 'pessimistic_est': 5, 'priority': 'high', 'phase': 'development'},
                {'name': 'Verify authorization endpoint constraints', 'description': 'Conduct permission boundary checks and unit tests.', 'optimistic_est': 1, 'most_likely_est': 2, 'pessimistic_est': 4, 'priority': 'medium', 'phase': 'testing'}
            ],
            'payment': [
                {'name': 'Design Payment gateway webhook sequence flow', 'description': 'Create sequence diagrams for secure checkout integrations.', 'optimistic_est': 1, 'most_likely_est': 2, 'pessimistic_est': 4, 'priority': 'high', 'phase': 'requirements'},
                {'name': 'Integrate Payment API and checkout webhooks', 'description': 'Develop checkout redirect endpoints and handle invoice fulfillment webhooks.', 'optimistic_est': 3, 'most_likely_est': 5, 'pessimistic_est': 9, 'priority': 'critical', 'phase': 'development'},
                {'name': 'Test Payment failures and refund flows', 'description': 'Simulate declined cards, server timeouts, and refunds.', 'optimistic_est': 1, 'most_likely_est': 3, 'pessimistic_est': 5, 'priority': 'high', 'phase': 'testing'}
            ],
            'cart': [
                {'name': 'Design Cart state sync endpoints', 'description': 'Define API formats for syncing visitor/user shopping carts.', 'optimistic_est': 1, 'most_likely_est': 2, 'pessimistic_est': 3, 'priority': 'medium', 'phase': 'requirements'},
                {'name': 'Implement Cart DB schema and updates logic', 'description': 'Develop cart endpoints, item count changes, and caching.', 'optimistic_est': 2, 'most_likely_est': 3, 'pessimistic_est': 6, 'priority': 'medium', 'phase': 'development'},
                {'name': 'Verify Cart inventory stock constraints', 'description': 'Write integration tests verifying inventory reserves on cart checkout.', 'optimistic_est': 1, 'most_likely_est': 2, 'pessimistic_est': 3, 'priority': 'high', 'phase': 'testing'}
            ],
            'order': [
                {'name': 'Design Order status states and progress UI', 'description': 'Define state transitions (paid, shipped, delivered) and progress bar wireframes.', 'optimistic_est': 1, 'most_likely_est': 2, 'pessimistic_est': 3, 'priority': 'low', 'phase': 'requirements'},
                {'name': 'Implement Order status tracker service', 'description': 'Build status polling cron services and email notifications templates.', 'optimistic_est': 2, 'most_likely_est': 4, 'pessimistic_est': 7, 'priority': 'medium', 'phase': 'development'},
                {'name': 'Test Order webhook triggers and data logs', 'description': 'Mock shipping provider webhook dispatches and test order list screens.', 'optimistic_est': 1, 'most_likely_est': 2, 'pessimistic_est': 4, 'priority': 'medium', 'phase': 'testing'}
            ],
            'search': [
                {'name': 'Design Product search indexing schema', 'description': 'Plan indexed columns and text search priorities.', 'optimistic_est': 1, 'most_likely_est': 2, 'pessimistic_est': 3, 'priority': 'medium', 'phase': 'requirements'},
                {'name': 'Implement Search API pagination & filters', 'description': 'Write optimized SQL queries with search indexing and category filters.', 'optimistic_est': 2, 'most_likely_est': 4, 'pessimistic_est': 7, 'priority': 'medium', 'phase': 'development'},
                {'name': 'Load test Search query response times', 'description': 'Simulate high volume filters and monitor query execution plans.', 'optimistic_est': 1, 'most_likely_est': 2, 'pessimistic_est': 4, 'priority': 'medium', 'phase': 'testing'}
            ]
        }

        # Generate module-specific tasks
        for module in modules_list:
            mod_key = module.lower()
            matched = False
            for kb_key in common_kb:
                if kb_key in mod_key:
                    matched = True
                    for t in common_kb[kb_key]:
                        tasks.append(t.copy())
                    break
            
            if not matched:
                # Custom module fallback
                tasks.extend([
                    {'name': f"Design {module} API schema & models", 'description': f"Model data inputs and outputs for {module} module.", 'optimistic_est': 1, 'most_likely_est': 2, 'pessimistic_est': 4, 'priority': 'medium', 'phase': 'requirements'},
                    {'name': f"Implement core logic of {module} Module", 'description': f"Develop backend APIs and core calculations for {module}.", 'optimistic_est': 2, 'most_likely_est': 4, 'pessimistic_est': 7, 'priority': 'medium', 'phase': 'development'},
                    {'name': f"Run QA integration tests on {module} API", 'description': f"Integrate {module} and check data flow boundaries.", 'optimistic_est': 1, 'most_likely_est': 2, 'pessimistic_est': 4, 'priority': 'low', 'phase': 'testing'}
                ])

        # Fetch existing project risks
        existing_risks = Risk.query.filter_by(project_id=project.id).all()
        # Add mitigation tasks for high risks (probability * impact >= 9)
        for risk in existing_risks:
            score = round(risk.probability * 5) * round(risk.impact * 5)
            if score >= 9:
                tasks.append({
                    'name': f"Mitigate Risk: {risk.title.split('/')[0].strip()}",
                    'description': f"Execute specific mitigation strategy: {risk.mitigation_plan or 'Implement safeguards.'}",
                    'optimistic_est': 1, 'most_likely_est': 2, 'pessimistic_est': 4,
                    'priority': 'high', 'phase': 'mitigation'
                })

        return {
            'tasks': tasks
        }

    def get_single_mitigation_suggestion(self, title, description, category):
        """
        Suggests a mitigation plan and trigger condition based on a risk's details.
        """
        # Check if Gemini model is active and key is present
        if self.model and os.environ.get("GEMINI_API_KEY"):
            prompt = f"""
You are an expert Software Risk Assessor.
Suggest a detailed mitigation plan and a specific trigger condition for the following risk:

Risk Title: {title}
Description: {description}
Category: {category}

Respond ONLY with a valid JSON object matching the following structure exactly. Do not include markdown formatting or backticks.

{{
    "mitigation_plan": "Specific steps to mitigate this risk",
    "trigger_condition": "Measurable threshold or event that activates the contingency plan"
}}
"""
            try:
                response = self.model.generate_content(prompt)
                text = response.text.strip()
                if text.startswith("```json"):
                    text = text[7:]
                if text.endswith("```"):
                    text = text[:-3]
                res_data = json.loads(text.strip())
                return res_data
            except Exception:
                pass # Fallback to heuristics below if LLM suggestion fails
                
        # Local Heuristics Fallback
        t_lower = title.lower()
        d_lower = description.lower()
        
        # Default suggestions
        mitigation_plan = "Perform early architectural reviews, write automated unit and integration tests, and draft API contract specifications."
        trigger_condition = "Integration error rate exceeds 3% or task delay exceeds 5 business days."
        
        # Heuristic matches
        if any(w in t_lower or w in d_lower for w in ['login', 'auth', 'signup', 'user', 'security', 'credential', 'hack']):
            mitigation_plan = "Implement rate limiting, multi-factor authentication (MFA), secure JWT tokens in HttpOnly cookies, and use bcrypt password hashing."
            trigger_condition = "Failed login attempts from single IP exceeds 20 in 5 minutes, or security scanner reports high vulnerability."
        elif any(w in t_lower or w in d_lower for w in ['payment', 'stripe', 'paypal', 'checkout', 'transaction', 'billing', 'charge']):
            mitigation_plan = "Implement circuit breaker pattern, setup a secondary payment gateway fallback, use database transactions, and queue failed checkouts for automatic retry."
            trigger_condition = "Payment API error rate exceeds 5% or payment gateway response latency exceeds 5 seconds."
        elif any(w in t_lower or w in d_lower for w in ['cart', 'wishlist', 'sync', 'store']):
            mitigation_plan = "Sync local storage state with the backend database upon user interactions and cache active carts using Redis."
            trigger_condition = "Shopping cart item sync mismatches reported by users exceed 2% of daily sessions."
        elif any(w in t_lower or w in d_lower for w in ['order', 'tracking', 'ship', 'delivery', 'webhook']):
            mitigation_plan = "Configure idempotent webhook receivers with robust execution logging and a manual order status reconciliation dashboard."
            trigger_condition = "Order status webhook delivery failures exceed 5% within a 24-hour window."
        elif any(w in t_lower or w in d_lower for w in ['search', 'catalog', 'query', 'filter', 'index']):
            mitigation_plan = "Add composite database indexing on search/filter columns, integrate Elasticsearch, and cache common query results."
            trigger_condition = "Search query execution time exceeds 2.5 seconds or CPU utilization on DB server exceeds 80%."
        elif any(w in t_lower or w in d_lower for w in ['server', 'downtime', 'crash', 'host', 'cloud', 'aws', 'db', 'database']):
            mitigation_plan = "Configure auto-scaling groups, deploy a backup server in a secondary availability zone, and set up database replication."
            trigger_condition = "Server CPU usage exceeds 90% for 10 minutes, or ping response fails for 3 consecutive checks."
        elif any(w in t_lower or w in d_lower for w in ['budget', 'cost', 'overrun', 'money', 'price']):
            mitigation_plan = "Establish strict scope changes board control, maintain a 15% budget buffer, and track resource hours weekly."
            trigger_condition = "Project budget burn rate exceeds forecast by 10% or scope addition requests exceed 3 items per month."
        elif any(w in t_lower or w in d_lower for w in ['delay', 'schedule', 'time', 'deadline', 'milestone', 'date']):
            mitigation_plan = "Add buffer days (15-30%) to task estimates, run weekly sprint progress reviews, and optimize critical path tasks."
            trigger_condition = "Task progress falls 10% behind the planned baseline at any major project milestone."
        elif any(w in t_lower or w in d_lower for w in ['team', 'staff', 'member', 'developer', 'person', 'resource']):
            mitigation_plan = "Maintain detailed documentation, cross-train developers on multiple modules, and schedule peer pair programming."
            trigger_condition = "Any key team member is absent or unavailable for more than 5 consecutive working days."
            
        return {
            'mitigation_plan': mitigation_plan,
            'trigger_condition': trigger_condition
        }

    def schedule_tasks(self, tasks, project_start_date, project_end_date):
        """
        Schedules a list of tasks sequentially inside four phases:
        Requirements (15%), Development (55%), Testing (15%), Mitigation (15%).
        """
        if not project_start_date:
            project_start_date = date.today()
        if not project_end_date:
            project_end_date = project_start_date + timedelta(days=60)
            
        duration_days = (project_end_date - project_start_date).days
        if duration_days < 1:
            duration_days = 1
            
        # Allocate calendar days to each phase
        req_days = max(1, round(duration_days * 0.15))
        dev_days = max(1, round(duration_days * 0.55))
        test_days = max(1, round(duration_days * 0.15))
        mit_days = max(1, duration_days - req_days - dev_days - test_days)
        
        phases_config = {
            'requirements': {'start_offset': 0, 'duration': req_days},
            'development': {'start_offset': req_days, 'duration': dev_days},
            'testing': {'start_offset': req_days + dev_days, 'duration': test_days},
            'mitigation': {'start_offset': req_days + dev_days + test_days, 'duration': mit_days}
        }
        
        # Classify any tasks that lack a valid phase
        for t in tasks:
            phase = t.get('phase', '').lower()
            if phase not in phases_config:
                name = t.get('name', '').lower()
                desc = t.get('description', '').lower()
                if any(w in name or w in desc for w in ['design', 'require', 'plan', 'scope', 'schema']):
                    phase = 'requirements'
                elif any(w in name or w in desc for w in ['test', 'qa', 'review', 'verify', 'integrate']):
                    phase = 'testing'
                elif any(w in name or w in desc for w in ['mitigat', 'buffer', 'contingency', 'backup', 'failover']):
                    phase = 'mitigation'
                else:
                    phase = 'development'
            t['phase'] = phase
            
        # Sequentially schedule tasks within each phase
        for phase_name, config in phases_config.items():
            phase_tasks = [t for t in tasks if t['phase'] == phase_name]
            if not phase_tasks:
                continue
                
            phase_start = project_start_date + timedelta(days=config['start_offset'])
            phase_duration = config['duration']
            
            # Equal partition of phase duration
            task_span = max(1, phase_duration // len(phase_tasks))
            
            current_date = phase_start
            for idx, t in enumerate(phase_tasks):
                t['start_date'] = current_date.strftime('%Y-%m-%d')
                
                # Let the final task run until the end of the phase
                if idx == len(phase_tasks) - 1:
                    t['end_date'] = (phase_start + timedelta(days=phase_duration)).strftime('%Y-%m-%d')
                else:
                    t['end_date'] = (current_date + timedelta(days=task_span)).strftime('%Y-%m-%d')
                    
                current_date = datetime.strptime(t['end_date'], '%Y-%m-%d').date()
                
        return tasks

    def apply_workflow_to_database(self, project_id, generated_data):
        """
        Saves task schedules and auto-populates missing mitigations for user-added risks.
        Does NOT delete existing user-added risks.
        """
        if "error" in generated_data:
            return False, generated_data["error"]
            
        try:
            # Auto-populate missing mitigations for user risks
            existing_risks = Risk.query.filter_by(project_id=project_id).all()
            for risk in existing_risks:
                if not risk.mitigation_plan or not risk.trigger_condition:
                    suggestion = self.get_single_mitigation_suggestion(risk.title, risk.description or '', risk.category or 'technical')
                    if not risk.mitigation_plan:
                        risk.mitigation_plan = suggestion['mitigation_plan']
                    if not risk.trigger_condition:
                        risk.trigger_condition = suggestion['trigger_condition']
            
            # Clear old tasks
            Task.query.filter_by(project_id=project_id).delete()
            db.session.commit()
            
            # Load project details to schedule dates
            project = Project.query.get(project_id)
            if not project:
                return False, "Project not found"
                
            tasks = generated_data.get("tasks", [])
            
            # Apply sequential task scheduling dates
            scheduled_tasks = self.schedule_tasks(tasks, project.start_date, project.end_date)
            
            # Create Scheduled Tasks
            for t in scheduled_tasks:
                start_date_val = None
                end_date_val = None
                if t.get("start_date"):
                    start_date_val = datetime.strptime(t.get("start_date"), "%Y-%m-%d").date()
                if t.get("end_date"):
                    end_date_val = datetime.strptime(t.get("end_date"), "%Y-%m-%d").date()

                task = Task(
                    project_id=project_id,
                    name=t.get("name"),
                    description=t.get("description"),
                    optimistic_est=t.get("optimistic_est", 1),
                    most_likely_est=t.get("most_likely_est", 3),
                    pessimistic_est=t.get("pessimistic_est", 7),
                    priority=t.get("priority", "medium"),
                    status="pending",
                    start_date=start_date_val,
                    end_date=end_date_val
                )
                task.compute_pert()
                db.session.add(task)
                
            db.session.commit()
            return True, "Successfully generated and applied workflow."
            
        except Exception as e:
            db.session.rollback()
            return False, f"Database error: {str(e)}"

# Singleton instance
workflow_engine = WorkflowEngine()
