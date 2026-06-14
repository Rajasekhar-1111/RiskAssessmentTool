-- ============================================================
--  Risk Assessment Tool — Supabase PostgreSQL Schema
--  Project ID : qonedsvysgxxulbbfnhf
--  Run this entire script in the Supabase SQL Editor
--  (Dashboard → SQL Editor → New query → paste → Run)
-- ============================================================

-- ──────────────────────────────────────────────
-- 0. Extensions
-- ──────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ──────────────────────────────────────────────
-- 1. USERS TABLE
--    Mirrors models.py  User  class.
--    We use Supabase Auth for actual login;
--    this table stores profile / role data.
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.users (
    id            SERIAL PRIMARY KEY,
    name          VARCHAR(100)  NOT NULL,
    email         VARCHAR(120)  NOT NULL UNIQUE,
    password_hash VARCHAR(256)  NOT NULL,
    role          VARCHAR(20)   NOT NULL DEFAULT 'project_manager'
                  CHECK (role IN ('admin', 'project_manager', 'team_member')),
    created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ──────────────────────────────────────────────
-- 2. PROJECTS TABLE
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.projects (
    id                SERIAL PRIMARY KEY,
    name              VARCHAR(200)  NOT NULL,
    description       TEXT,
    modules           TEXT          DEFAULT '',   -- comma-separated list
    owner_id          INTEGER       NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    start_date        DATE,
    end_date          DATE,
    budget            NUMERIC(15,2) DEFAULT 0,
    team_size         INTEGER       DEFAULT 1,
    technology        VARCHAR(200),
    methodology       VARCHAR(50)   DEFAULT 'agile'
                      CHECK (methodology IN ('agile', 'waterfall', 'hybrid')),
    complexity        VARCHAR(20)   DEFAULT 'medium'
                      CHECK (complexity IN ('low', 'medium', 'high', 'very_high')),
    status            VARCHAR(20)   DEFAULT 'planning'
                      CHECK (status IN ('planning', 'active', 'completed', 'on_hold')),
    overall_risk_score NUMERIC(5,2) DEFAULT 0,
    created_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Auto-update updated_at on every row change
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_projects_updated_at ON public.projects;
CREATE TRIGGER trg_projects_updated_at
    BEFORE UPDATE ON public.projects
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ──────────────────────────────────────────────
-- 3. RISKS TABLE
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.risks (
    id                SERIAL PRIMARY KEY,
    project_id        INTEGER       NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    title             VARCHAR(200)  NOT NULL,
    description       TEXT,
    category          VARCHAR(50),  -- technical, schedule, cost, resource, quality, external
    sei_class         VARCHAR(50),  -- product_engineering, development_environment, program_constraints
    sei_element       VARCHAR(100),
    probability       NUMERIC(4,3)  DEFAULT 0.5  CHECK (probability >= 0 AND probability <= 1),
    impact            NUMERIC(4,3)  DEFAULT 0.5  CHECK (impact >= 0 AND impact <= 1),
    risk_score        NUMERIC(5,2)  DEFAULT 0,   -- computed (1-25 scale)
    risk_level        VARCHAR(20)   CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
    status            VARCHAR(20)   DEFAULT 'identified'
                      CHECK (status IN ('identified', 'analyzed', 'mitigating', 'resolved', 'accepted')),
    mitigation_plan   TEXT,
    contingency_plan  TEXT,
    owner_id          INTEGER       REFERENCES public.users(id) ON DELETE SET NULL,
    trigger_condition VARCHAR(300),
    created_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at        TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_risks_updated_at ON public.risks;
CREATE TRIGGER trg_risks_updated_at
    BEFORE UPDATE ON public.risks
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ──────────────────────────────────────────────
-- 4. TASKS TABLE
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tasks (
    id               SERIAL PRIMARY KEY,
    project_id       INTEGER      NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    name             VARCHAR(200) NOT NULL,
    description      TEXT,
    optimistic_est   NUMERIC(8,2) DEFAULT 1,   -- days
    most_likely_est  NUMERIC(8,2) DEFAULT 3,   -- days
    pessimistic_est  NUMERIC(8,2) DEFAULT 7,   -- days
    pert_estimate    NUMERIC(8,2),              -- computed: (O + 4M + P) / 6
    assigned_to      INTEGER      REFERENCES public.users(id) ON DELETE SET NULL,
    status           VARCHAR(20)  DEFAULT 'pending'
                     CHECK (status IN ('pending', 'in_progress', 'completed', 'blocked')),
    priority         VARCHAR(20)  DEFAULT 'medium'
                     CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    start_date       DATE,
    end_date         DATE,
    risk_score       NUMERIC(5,2) DEFAULT 0,
    created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ──────────────────────────────────────────────
-- 5. SIMULATIONS TABLE
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.simulations (
    id           SERIAL PRIMARY KEY,
    project_id   INTEGER     NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    sim_type     VARCHAR(30) CHECK (sim_type IN ('monte_carlo', 'fuzzy_logic', 'ml_prediction')),
    input_params JSONB       DEFAULT '{}',  -- replaces Text/JSON with native JSONB
    results      JSONB       DEFAULT '{}',
    created_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ──────────────────────────────────────────────
-- 6. NLP_ANALYSES TABLE
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.nlp_analyses (
    id                    SERIAL PRIMARY KEY,
    project_id            INTEGER      NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    document_name         VARCHAR(200),
    original_text         TEXT,
    findings              JSONB        DEFAULT '[]',  -- JSON array
    risk_count            INTEGER      DEFAULT 0,
    ambiguity_count       INTEGER      DEFAULT 0,
    incompleteness_count  INTEGER      DEFAULT 0,
    overall_quality_score NUMERIC(5,2) DEFAULT 0,
    created_at            TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ──────────────────────────────────────────────
-- 7. INDEXES for common query patterns
-- ──────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_projects_owner_id   ON public.projects(owner_id);
CREATE INDEX IF NOT EXISTS idx_risks_project_id    ON public.risks(project_id);
CREATE INDEX IF NOT EXISTS idx_risks_owner_id      ON public.risks(owner_id);
CREATE INDEX IF NOT EXISTS idx_risks_risk_level    ON public.risks(risk_level);
CREATE INDEX IF NOT EXISTS idx_risks_status        ON public.risks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id    ON public.tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to   ON public.tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_simulations_project ON public.simulations(project_id);
CREATE INDEX IF NOT EXISTS idx_nlp_project         ON public.nlp_analyses(project_id);

-- ──────────────────────────────────────────────
-- 8. ROW LEVEL SECURITY (RLS)
--    Enable so Supabase Anon/Service keys are
--    scoped correctly.  Adjust policies to fit
--    your auth strategy (JWT user id, role, etc.)
-- ──────────────────────────────────────────────

ALTER TABLE public.users        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risks        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.simulations  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nlp_analyses ENABLE ROW LEVEL SECURITY;

-- Allow full access via service-role key (used by your Flask backend)
-- The service-role key bypasses RLS automatically, so no policy needed for it.

-- Public read + write policies for the publishable (anon) key.
-- IMPORTANT: Tighten these once you add Supabase Auth to the frontend.
CREATE POLICY "anon_select_users"        ON public.users        FOR SELECT USING (true);
CREATE POLICY "anon_insert_users"        ON public.users        FOR INSERT WITH CHECK (true);
CREATE POLICY "anon_select_projects"     ON public.projects     FOR SELECT USING (true);
CREATE POLICY "anon_insert_projects"     ON public.projects     FOR INSERT WITH CHECK (true);
CREATE POLICY "anon_update_projects"     ON public.projects     FOR UPDATE USING (true);
CREATE POLICY "anon_delete_projects"     ON public.projects     FOR DELETE USING (true);
CREATE POLICY "anon_select_risks"        ON public.risks        FOR SELECT USING (true);
CREATE POLICY "anon_insert_risks"        ON public.risks        FOR INSERT WITH CHECK (true);
CREATE POLICY "anon_update_risks"        ON public.risks        FOR UPDATE USING (true);
CREATE POLICY "anon_delete_risks"        ON public.risks        FOR DELETE USING (true);
CREATE POLICY "anon_select_tasks"        ON public.tasks        FOR SELECT USING (true);
CREATE POLICY "anon_insert_tasks"        ON public.tasks        FOR INSERT WITH CHECK (true);
CREATE POLICY "anon_update_tasks"        ON public.tasks        FOR UPDATE USING (true);
CREATE POLICY "anon_delete_tasks"        ON public.tasks        FOR DELETE USING (true);
CREATE POLICY "anon_select_simulations"  ON public.simulations  FOR SELECT USING (true);
CREATE POLICY "anon_insert_simulations"  ON public.simulations  FOR INSERT WITH CHECK (true);
CREATE POLICY "anon_select_nlp"          ON public.nlp_analyses FOR SELECT USING (true);
CREATE POLICY "anon_insert_nlp"          ON public.nlp_analyses FOR INSERT WITH CHECK (true);

-- ──────────────────────────────────────────────
-- 9. SEED DATA — Demo user (mirrors app.py seed)
-- ──────────────────────────────────────────────
INSERT INTO public.users (name, email, password_hash, role)
VALUES (
    'Demo User',
    'demo@srapp.dev',
    -- bcrypt hash of 'demo1234'  (generated by werkzeug generate_password_hash)
    'pbkdf2:sha256:600000$demoplaceholder$0000000000000000000000000000000000000000000000000000000000000000',
    'project_manager'
)
ON CONFLICT (email) DO NOTHING;

-- ──────────────────────────────────────────────
-- Done! All 6 tables created with indexes,
-- triggers, RLS policies, and a demo user.
-- ──────────────────────────────────────────────
