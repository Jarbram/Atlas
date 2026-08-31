-- =============================================================================
--  ATLAS — PostgreSQL Schema
--  Database: Supabase (PostgreSQL 15+)
--  Generated: 2026-08-29
--  Description: Master schema for the Atlas application, covering the Vault
--               (professional profile) and Radar (job-hunt intelligence) modules.
-- =============================================================================

-- NOTE: Run this script as the `postgres` superuser or any role that owns the
--       target schema.  Enable pgcrypto / uuid-ossp if gen_random_uuid() is not
--       available in your Postgres version (it is built-in from PG 13 onward).


-- =============================================================================
--  SECTION 0 — EXTENSIONS
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- =============================================================================
--  SECTION 1 — CUSTOM ENUM TYPES
-- =============================================================================

-- ── Employment type ──────────────────────────────────────────────────────────
CREATE TYPE employment_type_enum AS ENUM (
    'full_time',
    'part_time',
    'contract',
    'freelance',
    'internship'
);

-- ── Work modality ────────────────────────────────────────────────────────────
CREATE TYPE modality_enum AS ENUM (
    'remote',
    'hybrid',
    'onsite'
);

-- ── Certification category ───────────────────────────────────────────────────
CREATE TYPE cert_category_enum AS ENUM (
    'cloud',
    'security',
    'data',
    'ai_ml',
    'web_dev',
    'devops',
    'management',
    'language',
    'other'
);

-- ── Skill category ───────────────────────────────────────────────────────────
CREATE TYPE skill_category_enum AS ENUM (
    'language',
    'framework',
    'database',
    'cloud',
    'tool',
    'methodology',
    'soft_skill',
    'domain'
);

-- ── Proficiency level ────────────────────────────────────────────────────────
CREATE TYPE proficiency_level_enum AS ENUM (
    'beginner',
    'intermediate',
    'advanced',
    'expert'
);

-- ── Job source ───────────────────────────────────────────────────────────────
CREATE TYPE job_source_enum AS ENUM (
    'linkedin',
    'getonboard',
    'remoteok',
    'indeed',
    'greenhouse',
    'lever',
    'workable',
    'custom'
);

-- ── Seniority level ──────────────────────────────────────────────────────────
CREATE TYPE seniority_enum AS ENUM (
    'intern',
    'junior',
    'mid',
    'senior',
    'staff',
    'principal',
    'director',
    'vp',
    'c_level'
);

-- ── Salary period ────────────────────────────────────────────────────────────
CREATE TYPE salary_period_enum AS ENUM (
    'hourly',
    'monthly',
    'annual'
);

-- ── Job / application status ─────────────────────────────────────────────────
CREATE TYPE job_status_enum AS ENUM (
    'detected',
    'bookmarked',
    'discarded',
    'tailoring',
    'tailored',
    'applied',
    'interviewing',
    'offered',
    'rejected',
    'withdrawn'
);

-- ── Application event type ───────────────────────────────────────────────────
CREATE TYPE event_type_enum AS ENUM (
    'created',
    'pdf_generated',
    'applied',
    'viewed',
    'contacted',
    'interview_scheduled',
    'interview_completed',
    'offer_received',
    'offer_accepted',
    'offer_declined',
    'rejected',
    'withdrawn'
);


-- =============================================================================
--  SECTION 2 — REUSABLE TRIGGER FUNCTION: set_updated_at
-- =============================================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION set_updated_at() IS
    'Generic BEFORE UPDATE trigger function that stamps updated_at with the '
    'current transaction timestamp. Attach to any table that has an updated_at '
    'column via: CREATE TRIGGER trg_<table>_updated_at BEFORE UPDATE ON <table> '
    'FOR EACH ROW EXECUTE FUNCTION set_updated_at();';


-- =============================================================================
--  SECTION 3 — VAULT MODULE
--  Tables that store the user''s canonical professional profile (the "Vault").
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
--  3.1  vault_profiles
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE vault_profiles (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Identity
    full_name           TEXT        NOT NULL CHECK (char_length(full_name) BETWEEN 1 AND 200),
    professional_title  TEXT        CHECK (char_length(professional_title) <= 150),
    executive_summary   TEXT        CHECK (char_length(executive_summary) <= 5000),

    -- Contact & links
    linkedin_url        TEXT        CHECK (linkedin_url   ~ '^https?://'),
    github_url          TEXT        CHECK (github_url     ~ '^https?://'),
    portfolio_url       TEXT        CHECK (portfolio_url  ~ '^https?://'),
    location            TEXT        CHECK (char_length(location) <= 200),
    email               TEXT        CHECK (email ~* '^[A-Z0-9._%+\-]+@[A-Z0-9.\-]+\.[A-Z]{2,}$'),
    phone               TEXT        CHECK (char_length(phone) <= 30),

    -- Timestamps
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Each authenticated user may have exactly one vault profile
    CONSTRAINT uq_vault_profiles_user UNIQUE (user_id)
);

COMMENT ON TABLE  vault_profiles IS 'Master professional profile for each Atlas user (the "Vault"). One record per user.';
COMMENT ON COLUMN vault_profiles.id IS 'Surrogate primary key (UUID v4).';
COMMENT ON COLUMN vault_profiles.user_id IS 'FK to Supabase Auth users table. Cascade-deletes the profile when the account is removed.';
COMMENT ON COLUMN vault_profiles.executive_summary IS 'High-level career narrative used as the base for AI-tailored summaries. Max 5 000 chars.';
COMMENT ON COLUMN vault_profiles.linkedin_url IS 'Full canonical LinkedIn profile URL. Must start with http(s)://.';

-- Trigger
CREATE TRIGGER trg_vault_profiles_updated_at
    BEFORE UPDATE ON vault_profiles
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Indexes
CREATE INDEX idx_vault_profiles_user_id ON vault_profiles (user_id);


-- ─────────────────────────────────────────────────────────────────────────────
--  3.2  vault_experiences
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE vault_experiences (
    id                  UUID                 PRIMARY KEY DEFAULT gen_random_uuid(),
    vault_id            UUID                 NOT NULL REFERENCES vault_profiles(id) ON DELETE CASCADE,

    -- Role details
    company_name        TEXT                 NOT NULL CHECK (char_length(company_name) BETWEEN 1 AND 300),
    role_title          TEXT                 NOT NULL CHECK (char_length(role_title) BETWEEN 1 AND 200),
    employment_type     employment_type_enum NOT NULL,
    start_date          DATE                 NOT NULL,
    end_date            DATE,
    is_current          BOOLEAN              NOT NULL DEFAULT FALSE,
    location            TEXT                 CHECK (char_length(location) <= 200),
    modality            modality_enum,

    -- Content
    description         TEXT                 CHECK (char_length(description) <= 10000),
    -- Each element: { "description": str, "metric": str, "impact": str, "method_star": str }
    achievements        JSONB                NOT NULL DEFAULT '[]'::JSONB,
    tech_stack          TEXT[]               NOT NULL DEFAULT '{}',
    display_order       INT                  NOT NULL DEFAULT 0 CHECK (display_order >= 0),

    -- Timestamps
    created_at          TIMESTAMPTZ          NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ          NOT NULL DEFAULT NOW(),

    -- A closed position must have an end_date; a current one must not.
    CONSTRAINT chk_experience_dates CHECK (
        (is_current = TRUE  AND end_date IS NULL)
        OR
        (is_current = FALSE AND (end_date IS NULL OR end_date >= start_date))
    )
);

COMMENT ON TABLE  vault_experiences IS 'Work experiences stored with STAR-methodology achievements. Linked to a vault profile.';
COMMENT ON COLUMN vault_experiences.achievements IS
    'JSONB array of achievement objects. Expected shape per element: '
    '{ "description": string, "metric": string, "impact": string, "method_star": string }. '
    'Validated at the application layer.';
COMMENT ON COLUMN vault_experiences.tech_stack IS 'Technologies / tools used in this role, stored as a PostgreSQL text array.';
COMMENT ON COLUMN vault_experiences.display_order IS 'Manual sort order within the vault. Lower values appear first.';
COMMENT ON COLUMN vault_experiences.is_current IS 'TRUE when the user is actively employed in this role. end_date must be NULL when is_current is TRUE.';

-- Trigger
CREATE TRIGGER trg_vault_experiences_updated_at
    BEFORE UPDATE ON vault_experiences
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Indexes
CREATE INDEX idx_vault_experiences_vault_id ON vault_experiences (vault_id);
CREATE INDEX idx_vault_experiences_order    ON vault_experiences (vault_id, display_order);
CREATE INDEX idx_vault_experiences_dates    ON vault_experiences (vault_id, start_date DESC, end_date DESC NULLS FIRST);
CREATE INDEX idx_vault_experiences_tech     ON vault_experiences USING GIN (tech_stack);


-- ─────────────────────────────────────────────────────────────────────────────
--  3.3  vault_education
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE vault_education (
    id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    vault_id            UUID         NOT NULL REFERENCES vault_profiles(id) ON DELETE CASCADE,

    institution         TEXT         NOT NULL CHECK (char_length(institution) BETWEEN 1 AND 300),
    degree              TEXT         NOT NULL CHECK (char_length(degree) BETWEEN 1 AND 200),
    field_of_study      TEXT         CHECK (char_length(field_of_study) <= 200),
    start_year          INT          NOT NULL CHECK (start_year BETWEEN 1950 AND 2100),
    end_year            INT          CHECK (end_year BETWEEN 1950 AND 2100),
    is_ongoing          BOOLEAN      NOT NULL DEFAULT FALSE,
    gpa                 NUMERIC(3,2) CHECK (gpa BETWEEN 0.00 AND 4.00),
    honors              TEXT         CHECK (char_length(honors) <= 300),
    relevant_courses    TEXT[]       NOT NULL DEFAULT '{}',

    -- Timestamps
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_education_years CHECK (
        (is_ongoing = TRUE  AND end_year IS NULL)
        OR
        (is_ongoing = FALSE AND (end_year IS NULL OR end_year >= start_year))
    )
);

COMMENT ON TABLE  vault_education IS 'Academic and formal education records linked to a vault profile.';
COMMENT ON COLUMN vault_education.gpa IS 'Grade Point Average on a 0.00 to 4.00 scale. NULL if not applicable or not disclosed.';
COMMENT ON COLUMN vault_education.relevant_courses IS 'List of course names that are relevant to the user professional profile.';
COMMENT ON COLUMN vault_education.is_ongoing IS 'TRUE when the degree is still in progress. end_year must be NULL in this case.';

-- Trigger
CREATE TRIGGER trg_vault_education_updated_at
    BEFORE UPDATE ON vault_education
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Indexes
CREATE INDEX idx_vault_education_vault_id ON vault_education (vault_id);
CREATE INDEX idx_vault_education_years    ON vault_education (vault_id, start_year DESC);


-- ─────────────────────────────────────────────────────────────────────────────
--  3.4  vault_certifications
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE vault_certifications (
    id                  UUID               PRIMARY KEY DEFAULT gen_random_uuid(),
    vault_id            UUID               NOT NULL REFERENCES vault_profiles(id) ON DELETE CASCADE,

    name                TEXT               NOT NULL CHECK (char_length(name) BETWEEN 1 AND 300),
    issuing_org         TEXT               NOT NULL CHECK (char_length(issuing_org) BETWEEN 1 AND 300),
    issue_date          DATE               NOT NULL,
    expiry_date         DATE,
    credential_id       TEXT               CHECK (char_length(credential_id) <= 200),
    credential_url      TEXT               CHECK (credential_url ~ '^https?://'),
    category            cert_category_enum NOT NULL DEFAULT 'other',

    -- Timestamps
    created_at          TIMESTAMPTZ        NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ        NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_cert_dates CHECK (expiry_date IS NULL OR expiry_date > issue_date)
);

COMMENT ON TABLE  vault_certifications IS 'Professional certifications and credentials linked to a vault profile.';
COMMENT ON COLUMN vault_certifications.expiry_date IS 'NULL indicates the certification does not expire.';
COMMENT ON COLUMN vault_certifications.credential_url IS 'Public verification URL for the credential. Must start with http(s)://.';

-- Trigger
CREATE TRIGGER trg_vault_certifications_updated_at
    BEFORE UPDATE ON vault_certifications
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Indexes
CREATE INDEX idx_vault_certifications_vault_id ON vault_certifications (vault_id);
CREATE INDEX idx_vault_certifications_category ON vault_certifications (vault_id, category);
CREATE INDEX idx_vault_certifications_expiry   ON vault_certifications (vault_id, expiry_date NULLS LAST);


-- ─────────────────────────────────────────────────────────────────────────────
--  3.5  vault_skills
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE vault_skills (
    id                   UUID                   PRIMARY KEY DEFAULT gen_random_uuid(),
    vault_id             UUID                   NOT NULL REFERENCES vault_profiles(id) ON DELETE CASCADE,

    name                 TEXT                   NOT NULL CHECK (char_length(name) BETWEEN 1 AND 100),
    category             skill_category_enum    NOT NULL,
    proficiency_level    proficiency_level_enum NOT NULL DEFAULT 'intermediate',
    years_of_experience  NUMERIC(4,1)           CHECK (years_of_experience >= 0),
    is_featured          BOOLEAN                NOT NULL DEFAULT FALSE,

    -- Timestamps
    created_at           TIMESTAMPTZ            NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ            NOT NULL DEFAULT NOW(),

    -- A user should not duplicate the same skill name within a vault
    CONSTRAINT uq_vault_skills_name UNIQUE (vault_id, name)
);

COMMENT ON TABLE  vault_skills IS 'Skill inventory for a vault profile, categorised and proficiency-rated.';
COMMENT ON COLUMN vault_skills.is_featured IS 'When TRUE the skill is highlighted on the public profile and prioritised during AI tailoring.';
COMMENT ON COLUMN vault_skills.years_of_experience IS 'Self-reported years of practical experience with this skill. Supports one decimal place.';

-- Trigger
CREATE TRIGGER trg_vault_skills_updated_at
    BEFORE UPDATE ON vault_skills
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Indexes
CREATE INDEX idx_vault_skills_vault_id ON vault_skills (vault_id);
CREATE INDEX idx_vault_skills_category ON vault_skills (vault_id, category);
CREATE INDEX idx_vault_skills_featured ON vault_skills (vault_id, is_featured) WHERE is_featured = TRUE;


-- ─────────────────────────────────────────────────────────────────────────────
--  3.6  vault_projects
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE vault_projects (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    vault_id            UUID        NOT NULL REFERENCES vault_profiles(id) ON DELETE CASCADE,

    name                TEXT        NOT NULL CHECK (char_length(name) BETWEEN 1 AND 200),
    description         TEXT        CHECK (char_length(description) <= 5000),
    tech_stack          TEXT[]      NOT NULL DEFAULT '{}',
    role                TEXT        CHECK (char_length(role) <= 200),
    challenges          TEXT        CHECK (char_length(challenges) <= 3000),
    outcomes            TEXT        CHECK (char_length(outcomes) <= 3000),
    repo_url            TEXT        CHECK (repo_url  ~ '^https?://'),
    live_url            TEXT        CHECK (live_url  ~ '^https?://'),
    start_date          DATE,
    end_date            DATE,
    is_featured         BOOLEAN     NOT NULL DEFAULT FALSE,

    -- Timestamps
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT chk_project_dates CHECK (end_date IS NULL OR end_date >= start_date)
);

COMMENT ON TABLE  vault_projects IS 'Portfolio projects linked to a vault profile.';
COMMENT ON COLUMN vault_projects.challenges IS 'Technical or organisational challenges the user faced during the project.';
COMMENT ON COLUMN vault_projects.outcomes IS 'Measurable results and learnings from the project.';
COMMENT ON COLUMN vault_projects.is_featured IS 'Featured projects are surfaced prominently in generated resumes and the public profile.';

-- Trigger
CREATE TRIGGER trg_vault_projects_updated_at
    BEFORE UPDATE ON vault_projects
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Indexes
CREATE INDEX idx_vault_projects_vault_id ON vault_projects (vault_id);
CREATE INDEX idx_vault_projects_featured ON vault_projects (vault_id, is_featured) WHERE is_featured = TRUE;
CREATE INDEX idx_vault_projects_tech     ON vault_projects USING GIN (tech_stack);


-- =============================================================================
--  SECTION 4 — RADAR MODULE
--  Tables that power the job-hunt intelligence layer ("Radar").
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
--  4.1  radar_jobs
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE radar_jobs (
    id                      UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                 UUID              NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Source metadata
    source                  job_source_enum   NOT NULL,
    external_id             TEXT              NOT NULL CHECK (char_length(external_id) BETWEEN 1 AND 500),

    -- Job details
    title                   TEXT              NOT NULL CHECK (char_length(title) BETWEEN 1 AND 300),
    company                 TEXT              NOT NULL CHECK (char_length(company) BETWEEN 1 AND 300),
    company_logo_url        TEXT              CHECK (company_logo_url ~ '^https?://'),
    seniority               seniority_enum,
    modality                modality_enum,
    location                TEXT              CHECK (char_length(location) <= 300),

    -- Compensation
    salary_min              NUMERIC(12,2)     CHECK (salary_min >= 0),
    salary_max              NUMERIC(12,2)     CHECK (salary_max >= 0),
    salary_currency         TEXT              NOT NULL DEFAULT 'USD' CHECK (char_length(salary_currency) = 3),
    salary_period           salary_period_enum,

    -- Content
    description_raw         TEXT,
    -- Extracted structured requirements: { "must_have": [...], "nice_to_have": [...], "years_exp": int }
    requirements_extracted  JSONB             NOT NULL DEFAULT '{}'::JSONB,
    tech_stack_detected     TEXT[]            NOT NULL DEFAULT '{}',
    apply_url               TEXT              CHECK (apply_url ~ '^https?://'),

    -- Timing
    posted_at               TIMESTAMPTZ,
    scraped_at              TIMESTAMPTZ       NOT NULL DEFAULT NOW(),

    -- AI matching
    match_score             NUMERIC(5,2)      CHECK (match_score BETWEEN 0 AND 100),
    -- { "skills": float, "seniority": float, "salary": float, "location": float, "overall": float }
    match_breakdown         JSONB             NOT NULL DEFAULT '{}'::JSONB,

    -- Workflow
    status                  job_status_enum   NOT NULL DEFAULT 'detected',
    radar_tags              TEXT[]            NOT NULL DEFAULT '{}',

    -- Timestamps
    created_at              TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ       NOT NULL DEFAULT NOW(),

    -- Deduplication: one job per user per source
    CONSTRAINT uq_radar_jobs_user_source_ext UNIQUE (user_id, source, external_id),
    CONSTRAINT chk_radar_salary_range CHECK (salary_max IS NULL OR salary_min IS NULL OR salary_max >= salary_min)
);

COMMENT ON TABLE  radar_jobs IS 'Scraped and manually-added job listings tracked per user. Central table of the Radar module.';
COMMENT ON COLUMN radar_jobs.external_id IS 'The ID of the listing on the originating platform. Combined with (user_id, source) it is globally unique.';
COMMENT ON COLUMN radar_jobs.match_score IS 'Overall match percentage (0-100) computed by calculate_match_score(). NULL until scored.';
COMMENT ON COLUMN radar_jobs.match_breakdown IS 'Granular score components from the AI match engine. Shape: { "skills", "seniority", "salary", "location", "overall" }.';
COMMENT ON COLUMN radar_jobs.requirements_extracted IS 'LLM-extracted structured requirements. Shape: { "must_have": [], "nice_to_have": [], "years_exp": int }.';
COMMENT ON COLUMN radar_jobs.status IS 'Kanban-style workflow status tracking the user engagement with this listing.';

-- Trigger
CREATE TRIGGER trg_radar_jobs_updated_at
    BEFORE UPDATE ON radar_jobs
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Indexes
CREATE INDEX idx_radar_jobs_user_id     ON radar_jobs (user_id);
CREATE INDEX idx_radar_jobs_status      ON radar_jobs (user_id, status);
CREATE INDEX idx_radar_jobs_match_score ON radar_jobs (user_id, match_score DESC NULLS LAST);
CREATE INDEX idx_radar_jobs_posted_at   ON radar_jobs (user_id, posted_at DESC NULLS LAST);
CREATE INDEX idx_radar_jobs_source      ON radar_jobs (user_id, source);
CREATE INDEX idx_radar_jobs_tech        ON radar_jobs USING GIN (tech_stack_detected);
CREATE INDEX idx_radar_jobs_tags        ON radar_jobs USING GIN (radar_tags);
CREATE INDEX idx_radar_jobs_seniority   ON radar_jobs (user_id, seniority);


-- ─────────────────────────────────────────────────────────────────────────────
--  4.2  radar_search_configs
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE radar_search_configs (
    id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    name                TEXT          NOT NULL CHECK (char_length(name) BETWEEN 1 AND 200),
    is_active           BOOLEAN       NOT NULL DEFAULT TRUE,

    -- Search criteria
    keywords            TEXT[]        NOT NULL DEFAULT '{}',
    roles               TEXT[]        NOT NULL DEFAULT '{}',
    locations           TEXT[]        NOT NULL DEFAULT '{}',
    remote_only         BOOLEAN       NOT NULL DEFAULT FALSE,
    min_salary          NUMERIC(12,2) CHECK (min_salary >= 0),
    seniority_filter    TEXT[]        NOT NULL DEFAULT '{}',
    sources             TEXT[]        NOT NULL DEFAULT '{}',

    -- Scoring thresholds
    min_match_score     INT           NOT NULL DEFAULT 70 CHECK (min_match_score BETWEEN 0 AND 100),
    notify_above        INT           NOT NULL DEFAULT 80 CHECK (notify_above BETWEEN 0 AND 100),

    -- Scheduler
    cron_expression     TEXT          NOT NULL DEFAULT '0 */6 * * *',
    last_run_at         TIMESTAMPTZ,

    -- Timestamps
    created_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  radar_search_configs IS 'Saved search configurations that drive the automated Radar scraping jobs.';
COMMENT ON COLUMN radar_search_configs.cron_expression IS 'Standard 5-field cron expression defining the scraping schedule. Default: every 6 hours.';
COMMENT ON COLUMN radar_search_configs.min_match_score IS 'Jobs scoring below this threshold are auto-discarded. Range 0-100.';
COMMENT ON COLUMN radar_search_configs.notify_above IS 'Jobs scoring at or above this threshold trigger a push notification to the user. Range 0-100.';
COMMENT ON COLUMN radar_search_configs.seniority_filter IS 'Array of seniority_enum values to include. Empty array = no filter (all seniorities).';
COMMENT ON COLUMN radar_search_configs.sources IS 'Array of job_source_enum values to scrape. Empty array = all sources.';

-- Trigger
CREATE TRIGGER trg_radar_search_configs_updated_at
    BEFORE UPDATE ON radar_search_configs
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Indexes
CREATE INDEX idx_radar_search_configs_user_id ON radar_search_configs (user_id);
CREATE INDEX idx_radar_search_configs_active  ON radar_search_configs (user_id, is_active) WHERE is_active = TRUE;


-- =============================================================================
--  SECTION 5 — APPLICATIONS MODULE
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
--  5.1  tailored_applications
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE tailored_applications (
    id                      UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                 UUID          NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    job_id                  UUID          NOT NULL REFERENCES radar_jobs(id) ON DELETE CASCADE,
    vault_id                UUID          NOT NULL REFERENCES vault_profiles(id) ON DELETE RESTRICT,

    -- Versioning (allows re-tailoring the same job)
    version                 INT           NOT NULL DEFAULT 1 CHECK (version >= 1),

    -- Vault item selections (arrays of UUIDs referencing vault sub-tables)
    selected_experiences    UUID[]        NOT NULL DEFAULT '{}',
    selected_skills         UUID[]        NOT NULL DEFAULT '{}',
    selected_projects       UUID[]        NOT NULL DEFAULT '{}',

    -- AI-generated content
    tailored_summary        TEXT          CHECK (char_length(tailored_summary) <= 5000),
    tailored_achievements   JSONB         NOT NULL DEFAULT '[]'::JSONB,
    cover_letter            TEXT,
    recruiter_message       TEXT          CHECK (char_length(recruiter_message) <= 2000),
    presentation_extract    TEXT          CHECK (char_length(presentation_extract) <= 1000),
    -- { "skill_gaps": [], "strengths": [], "suggestions": [], "overall_fit": float }
    alignment_report        JSONB         NOT NULL DEFAULT '{}'::JSONB,

    -- Output artefacts
    pdf_url                 TEXT          CHECK (pdf_url ~ '^https?://'),
    pdf_generated_at        TIMESTAMPTZ,

    -- LLM provenance
    llm_model               TEXT          CHECK (char_length(llm_model) <= 100),
    llm_tokens_used         INT           CHECK (llm_tokens_used >= 0),
    llm_cost_usd            NUMERIC(10,6) CHECK (llm_cost_usd >= 0),

    -- Timestamps
    created_at              TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

    -- One version per (user, job) pair; increment version for re-tailoring
    CONSTRAINT uq_tailored_applications_version UNIQUE (user_id, job_id, version)
);

COMMENT ON TABLE  tailored_applications IS 'AI-tailored application packages generated from the user vault for a specific job listing.';
COMMENT ON COLUMN tailored_applications.version IS 'Monotonically increasing version number. Allows multiple tailoring attempts per job.';
COMMENT ON COLUMN tailored_applications.selected_experiences IS 'UUIDs from vault_experiences chosen for this application by the AI or user.';
COMMENT ON COLUMN tailored_applications.tailored_achievements IS 'AI-rewritten achievement bullets adapted to the job requirements. Shape mirrors vault_experiences.achievements.';
COMMENT ON COLUMN tailored_applications.alignment_report IS 'Structured fit analysis. Shape: { "skill_gaps": [], "strengths": [], "suggestions": [], "overall_fit": float }.';
COMMENT ON COLUMN tailored_applications.llm_cost_usd IS 'Estimated cost in USD for the LLM call(s) used to generate this application. Stored for billing analytics.';

-- Trigger
CREATE TRIGGER trg_tailored_applications_updated_at
    BEFORE UPDATE ON tailored_applications
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Indexes
CREATE INDEX idx_tailored_applications_user_id  ON tailored_applications (user_id);
CREATE INDEX idx_tailored_applications_job_id   ON tailored_applications (job_id);
CREATE INDEX idx_tailored_applications_vault_id ON tailored_applications (vault_id);
CREATE INDEX idx_tailored_applications_created  ON tailored_applications (user_id, created_at DESC);


-- ─────────────────────────────────────────────────────────────────────────────
--  5.2  application_events
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE application_events (
    id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id      UUID            NOT NULL REFERENCES tailored_applications(id) ON DELETE CASCADE,
    user_id             UUID            NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    event_type          event_type_enum NOT NULL,
    notes               TEXT            CHECK (char_length(notes) <= 5000),
    occurred_at         TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    -- Freeform payload for event-type-specific data (e.g. interviewer name, salary offered)
    metadata            JSONB           NOT NULL DEFAULT '{}'::JSONB
);

COMMENT ON TABLE  application_events IS 'Immutable event log tracking every status change and interaction for a tailored application (append-only).';
COMMENT ON COLUMN application_events.occurred_at IS 'Wall-clock time of the real-world event (may differ from row insertion time).';
COMMENT ON COLUMN application_events.metadata IS 'Freeform JSON payload for event-specific context, e.g. {"interviewer": "Jane Doe", "platform": "Zoom"}.';

-- NOTE: application_events is intentionally append-only — no updated_at column.

-- Indexes
CREATE INDEX idx_application_events_application_id ON application_events (application_id, occurred_at DESC);
CREATE INDEX idx_application_events_user_id        ON application_events (user_id, occurred_at DESC);
CREATE INDEX idx_application_events_event_type     ON application_events (user_id, event_type);


-- =============================================================================
--  SECTION 6 — ROW-LEVEL SECURITY (RLS)
--  All tables enforce strict ownership: users can only access their own rows.
--  Service-role key (used by Edge Functions) bypasses RLS automatically.
-- =============================================================================

-- ── Helper: current authenticated user ───────────────────────────────────────
-- auth.uid() is the built-in Supabase function that returns the UUID of the
-- currently authenticated user from the JWT.

-- ─────────────────────────────────────────────────────────────────────────────
--  6.1  vault_profiles RLS
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE vault_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY vault_profiles_select ON vault_profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY vault_profiles_insert ON vault_profiles
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY vault_profiles_update ON vault_profiles
    FOR UPDATE USING  (auth.uid() = user_id)
    WITH CHECK        (auth.uid() = user_id);

CREATE POLICY vault_profiles_delete ON vault_profiles
    FOR DELETE USING (auth.uid() = user_id);


-- ─────────────────────────────────────────────────────────────────────────────
--  6.2  vault_experiences RLS  (indirect ownership via vault_profiles)
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE vault_experiences ENABLE ROW LEVEL SECURITY;

CREATE POLICY vault_experiences_select ON vault_experiences
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM vault_profiles vp WHERE vp.id = vault_id AND vp.user_id = auth.uid())
    );

CREATE POLICY vault_experiences_insert ON vault_experiences
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM vault_profiles vp WHERE vp.id = vault_id AND vp.user_id = auth.uid())
    );

CREATE POLICY vault_experiences_update ON vault_experiences
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM vault_profiles vp WHERE vp.id = vault_id AND vp.user_id = auth.uid())
    )
    WITH CHECK (
        EXISTS (SELECT 1 FROM vault_profiles vp WHERE vp.id = vault_id AND vp.user_id = auth.uid())
    );

CREATE POLICY vault_experiences_delete ON vault_experiences
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM vault_profiles vp WHERE vp.id = vault_id AND vp.user_id = auth.uid())
    );


-- ─────────────────────────────────────────────────────────────────────────────
--  6.3  vault_education RLS
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE vault_education ENABLE ROW LEVEL SECURITY;

CREATE POLICY vault_education_select ON vault_education
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM vault_profiles vp WHERE vp.id = vault_id AND vp.user_id = auth.uid())
    );

CREATE POLICY vault_education_insert ON vault_education
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM vault_profiles vp WHERE vp.id = vault_id AND vp.user_id = auth.uid())
    );

CREATE POLICY vault_education_update ON vault_education
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM vault_profiles vp WHERE vp.id = vault_id AND vp.user_id = auth.uid())
    )
    WITH CHECK (
        EXISTS (SELECT 1 FROM vault_profiles vp WHERE vp.id = vault_id AND vp.user_id = auth.uid())
    );

CREATE POLICY vault_education_delete ON vault_education
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM vault_profiles vp WHERE vp.id = vault_id AND vp.user_id = auth.uid())
    );


-- ─────────────────────────────────────────────────────────────────────────────
--  6.4  vault_certifications RLS
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE vault_certifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY vault_certifications_select ON vault_certifications
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM vault_profiles vp WHERE vp.id = vault_id AND vp.user_id = auth.uid())
    );

CREATE POLICY vault_certifications_insert ON vault_certifications
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM vault_profiles vp WHERE vp.id = vault_id AND vp.user_id = auth.uid())
    );

CREATE POLICY vault_certifications_update ON vault_certifications
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM vault_profiles vp WHERE vp.id = vault_id AND vp.user_id = auth.uid())
    )
    WITH CHECK (
        EXISTS (SELECT 1 FROM vault_profiles vp WHERE vp.id = vault_id AND vp.user_id = auth.uid())
    );

CREATE POLICY vault_certifications_delete ON vault_certifications
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM vault_profiles vp WHERE vp.id = vault_id AND vp.user_id = auth.uid())
    );


-- ─────────────────────────────────────────────────────────────────────────────
--  6.5  vault_skills RLS
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE vault_skills ENABLE ROW LEVEL SECURITY;

CREATE POLICY vault_skills_select ON vault_skills
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM vault_profiles vp WHERE vp.id = vault_id AND vp.user_id = auth.uid())
    );

CREATE POLICY vault_skills_insert ON vault_skills
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM vault_profiles vp WHERE vp.id = vault_id AND vp.user_id = auth.uid())
    );

CREATE POLICY vault_skills_update ON vault_skills
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM vault_profiles vp WHERE vp.id = vault_id AND vp.user_id = auth.uid())
    )
    WITH CHECK (
        EXISTS (SELECT 1 FROM vault_profiles vp WHERE vp.id = vault_id AND vp.user_id = auth.uid())
    );

CREATE POLICY vault_skills_delete ON vault_skills
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM vault_profiles vp WHERE vp.id = vault_id AND vp.user_id = auth.uid())
    );


-- ─────────────────────────────────────────────────────────────────────────────
--  6.6  vault_projects RLS
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE vault_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY vault_projects_select ON vault_projects
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM vault_profiles vp WHERE vp.id = vault_id AND vp.user_id = auth.uid())
    );

CREATE POLICY vault_projects_insert ON vault_projects
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM vault_profiles vp WHERE vp.id = vault_id AND vp.user_id = auth.uid())
    );

CREATE POLICY vault_projects_update ON vault_projects
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM vault_profiles vp WHERE vp.id = vault_id AND vp.user_id = auth.uid())
    )
    WITH CHECK (
        EXISTS (SELECT 1 FROM vault_profiles vp WHERE vp.id = vault_id AND vp.user_id = auth.uid())
    );

CREATE POLICY vault_projects_delete ON vault_projects
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM vault_profiles vp WHERE vp.id = vault_id AND vp.user_id = auth.uid())
    );


-- ─────────────────────────────────────────────────────────────────────────────
--  6.7  radar_jobs RLS
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE radar_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY radar_jobs_select ON radar_jobs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY radar_jobs_insert ON radar_jobs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY radar_jobs_update ON radar_jobs
    FOR UPDATE USING  (auth.uid() = user_id)
    WITH CHECK        (auth.uid() = user_id);

CREATE POLICY radar_jobs_delete ON radar_jobs
    FOR DELETE USING (auth.uid() = user_id);


-- ─────────────────────────────────────────────────────────────────────────────
--  6.8  radar_search_configs RLS
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE radar_search_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY radar_search_configs_select ON radar_search_configs
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY radar_search_configs_insert ON radar_search_configs
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY radar_search_configs_update ON radar_search_configs
    FOR UPDATE USING  (auth.uid() = user_id)
    WITH CHECK        (auth.uid() = user_id);

CREATE POLICY radar_search_configs_delete ON radar_search_configs
    FOR DELETE USING (auth.uid() = user_id);


-- ─────────────────────────────────────────────────────────────────────────────
--  6.9  tailored_applications RLS
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE tailored_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY tailored_applications_select ON tailored_applications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY tailored_applications_insert ON tailored_applications
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY tailored_applications_update ON tailored_applications
    FOR UPDATE USING  (auth.uid() = user_id)
    WITH CHECK        (auth.uid() = user_id);

CREATE POLICY tailored_applications_delete ON tailored_applications
    FOR DELETE USING (auth.uid() = user_id);


-- ─────────────────────────────────────────────────────────────────────────────
--  6.10  application_events RLS
--  Events are append-only: no UPDATE or DELETE allowed via client.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE application_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY application_events_select ON application_events
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY application_events_insert ON application_events
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Intentionally no UPDATE / DELETE policy for application_events.
-- Modifications must go through a privileged service-role function if ever needed.


-- =============================================================================
--  SECTION 7 — AI MATCH SCORING FUNCTION (STUB)
-- =============================================================================

CREATE OR REPLACE FUNCTION calculate_match_score(
    p_job_id    UUID,
    p_vault_id  UUID
)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
/*
    calculate_match_score
    ---------------------
    Computes a 0-100 match percentage between a radar_jobs listing and a
    vault_profiles profile.

    Implementation notes (TODO):
    ─────────────────────────────
    1. Skill overlap
       - Pull tech_stack_detected from radar_jobs.
       - Pull vault_skills.name WHERE vault_id = p_vault_id.
       - Compute Jaccard similarity -> weighted 40 %.

    2. Seniority alignment
       - Compare radar_jobs.seniority against the vault max years_of_experience.
       - Weighted 20 %.

    3. Salary fit
       - Compare radar_jobs.salary_min / salary_max against the user
         target salary stored in (future) user_preferences table.
       - Weighted 20 %.

    4. Location / modality match
       - Compare radar_jobs.modality and location against the user
         radar_search_configs preferences.
       - Weighted 20 %.

    5. Persist results back to radar_jobs:
           UPDATE radar_jobs
           SET    match_score     = <computed_score>,
                  match_breakdown = <breakdown_jsonb>
           WHERE  id = p_job_id;

    Returns:
        NUMERIC -- the overall match score in [0, 100], rounded to two decimals.
        Returns NULL if either argument does not exist.
*/
DECLARE
    v_score NUMERIC := 0;
BEGIN
    -- Guard: validate inputs
    IF NOT EXISTS (SELECT 1 FROM radar_jobs     WHERE id = p_job_id)   THEN RETURN NULL; END IF;
    IF NOT EXISTS (SELECT 1 FROM vault_profiles WHERE id = p_vault_id) THEN RETURN NULL; END IF;

    -- STUB: Replace the lines below with the real scoring logic
    v_score := 0;

    -- Persist (no-op in stub)
    UPDATE radar_jobs
    SET    match_score     = v_score,
           match_breakdown = '{}'::JSONB
    WHERE  id = p_job_id;

    RETURN v_score;
END;
$$;

COMMENT ON FUNCTION calculate_match_score(UUID, UUID) IS
    'STUB -- Computes and persists a 0-100 AI match score between a radar_jobs '
    'listing (p_job_id) and a vault_profiles profile (p_vault_id). '
    'Results are written to radar_jobs.match_score and radar_jobs.match_breakdown. '
    'Replace the stub body with real scoring logic (skill overlap, seniority, '
    'salary, location/modality). Runs as SECURITY DEFINER so Edge Functions '
    'can invoke it without exposing direct table write access to the client.';


-- =============================================================================
--  SECTION 8 — GRANTS
--  Grant usage to the anon and authenticated roles used by Supabase PostgREST.
--  RLS enforces per-row access on top of these grants.
-- =============================================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Tables (authenticated users only -- anon cannot access any Vault/Radar data)
GRANT SELECT, INSERT, UPDATE, DELETE ON
    vault_profiles,
    vault_experiences,
    vault_education,
    vault_certifications,
    vault_skills,
    vault_projects,
    radar_jobs,
    radar_search_configs,
    tailored_applications,
    application_events
TO authenticated;

-- Functions
GRANT EXECUTE ON FUNCTION calculate_match_score(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION set_updated_at()                  TO authenticated;


-- =============================================================================
--  END OF SCHEMA
-- =============================================================================
