"""
Migrate data from local SQLite to Supabase PostgreSQL.
Preserves all IDs and relationships.
"""
import sqlite3
import psycopg2
import os
from dotenv import load_dotenv

load_dotenv('backend/.env')

SQLITE_PATH = 'backend/riskdb.sqlite'
PG_URL = os.environ['DATABASE_URL']
if PG_URL.startswith("postgres://"):
    PG_URL = PG_URL.replace("postgres://", "postgresql://", 1)
if "sslmode" not in PG_URL:
    PG_URL += "?sslmode=require"

# Connect to both databases
sqlite_conn = sqlite3.connect(SQLITE_PATH)
sqlite_conn.row_factory = sqlite3.Row
sq = sqlite_conn.cursor()

pg_conn = psycopg2.connect(PG_URL, connect_timeout=10)
pg_conn.autocommit = False
pg = pg_conn.cursor()

print("=== SQLite Data Inventory ===")
tables = ['users', 'projects', 'risks', 'tasks', 'simulations', 'nlp_analyses']
for t in tables:
    count = sq.execute(f"SELECT count(*) FROM {t}").fetchone()[0]
    print(f"  {t}: {count} rows")

print("\n=== Migrating to Supabase ===")

try:
    # Clear existing data in Supabase to avoid ID and unique constraint conflicts
    print("  Clearing existing data in Supabase...")
    pg.execute("TRUNCATE TABLE nlp_analyses, simulations, tasks, risks, projects, users RESTART IDENTITY CASCADE;")

    # 1. Users - upsert by id
    rows = sq.execute("SELECT id, name, email, password_hash, role, created_at FROM users").fetchall()
    for r in rows:
        pg.execute("""
            INSERT INTO users (id, name, email, password_hash, role, created_at)
            VALUES (%s, %s, %s, %s, %s, %s)
            ON CONFLICT (id) DO UPDATE SET
                name = EXCLUDED.name,
                email = EXCLUDED.email,
                password_hash = EXCLUDED.password_hash,
                role = EXCLUDED.role
        """, (r['id'], r['name'], r['email'], r['password_hash'], r['role'], r['created_at']))
    print(f"  Users: migrated {len(rows)} rows")

    # 2. Projects
    rows = sq.execute("SELECT * FROM projects").fetchall()
    for r in rows:
        pg.execute("""
            INSERT INTO projects (id, name, description, modules, owner_id, start_date, end_date,
                budget, team_size, technology, methodology, complexity, status,
                overall_risk_score, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (id) DO NOTHING
        """, (r['id'], r['name'], r['description'], r['modules'], r['owner_id'],
              r['start_date'], r['end_date'], r['budget'], r['team_size'],
              r['technology'], r['methodology'], r['complexity'], r['status'],
              r['overall_risk_score'], r['created_at'], r['updated_at']))
    print(f"  Projects: migrated {len(rows)} rows")

    # 3. Risks
    rows = sq.execute("SELECT * FROM risks").fetchall()
    for r in rows:
        pg.execute("""
            INSERT INTO risks (id, project_id, title, description, category, sei_class, sei_element,
                probability, impact, risk_score, risk_level, status, mitigation_plan,
                contingency_plan, owner_id, trigger_condition, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (id) DO NOTHING
        """, (r['id'], r['project_id'], r['title'], r['description'], r['category'],
              r['sei_class'], r['sei_element'], r['probability'], r['impact'],
              r['risk_score'], r['risk_level'], r['status'], r['mitigation_plan'],
              r['contingency_plan'], r['owner_id'], r['trigger_condition'],
              r['created_at'], r['updated_at']))
    print(f"  Risks: migrated {len(rows)} rows")

    def cap(val, max_val):
        if val is None: return None
        return min(float(val), max_val)

    # 4. Tasks
    rows = sq.execute("SELECT * FROM tasks").fetchall()
    for r in rows:
        pg.execute("""
            INSERT INTO tasks (id, project_id, name, description, optimistic_est, most_likely_est,
                pessimistic_est, pert_estimate, assigned_to, status, priority,
                start_date, end_date, risk_score, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (id) DO NOTHING
        """, (r['id'], r['project_id'], r['name'], r['description'],
              cap(r['optimistic_est'], 999999.99), cap(r['most_likely_est'], 999999.99), cap(r['pessimistic_est'], 999999.99),
              cap(r['pert_estimate'], 999999.99), r['assigned_to'], r['status'], r['priority'],
              r['start_date'], r['end_date'], cap(r['risk_score'], 999.99), r['created_at']))
    print(f"  Tasks: migrated {len(rows)} rows")

    # 5. Simulations
    rows = sq.execute("SELECT * FROM simulations").fetchall()
    for r in rows:
        pg.execute("""
            INSERT INTO simulations (id, project_id, sim_type, input_params, results, created_at)
            VALUES (%s, %s, %s, %s, %s, %s)
            ON CONFLICT (id) DO NOTHING
        """, (r['id'], r['project_id'], r['sim_type'], r['input_params'],
              r['results'], r['created_at']))
    print(f"  Simulations: migrated {len(rows)} rows")

    # 6. NLP Analyses
    rows = sq.execute("SELECT * FROM nlp_analyses").fetchall()
    for r in rows:
        pg.execute("""
            INSERT INTO nlp_analyses (id, project_id, document_name, original_text, findings,
                risk_count, ambiguity_count, incompleteness_count,
                overall_quality_score, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (id) DO NOTHING
        """, (r['id'], r['project_id'], r['document_name'], r['original_text'],
              r['findings'], r['risk_count'], r['ambiguity_count'],
              r['incompleteness_count'], r['overall_quality_score'], r['created_at']))
    print(f"  NLP Analyses: migrated {len(rows)} rows")

    # Reset sequences so new IDs don't collide
    for table in tables:
        pg.execute(f"SELECT setval(pg_get_serial_sequence('{table}', 'id'), COALESCE((SELECT MAX(id) FROM {table}), 1))")

    pg_conn.commit()
    print("\n=== Migration complete! All data committed to Supabase. ===")

except Exception as e:
    pg_conn.rollback()
    print(f"\nMigration FAILED, rolled back: {e}")
    raise
finally:
    sqlite_conn.close()
    pg_conn.close()
