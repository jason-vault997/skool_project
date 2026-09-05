-- ============================================================
-- BUILD100 — Phase 6: Business Operating System
-- Migration: 20260905_phase6_business_os.sql
--
-- Creates:
--   business_goals   — goal tracking with priority + status
--   weekly_reviews   — operator debrief with auto-metrics
--
-- Run once in Supabase SQL Editor.
-- DO NOT run previous migrations again.
-- ============================================================

-- ── TABLE: business_goals ────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.business_goals (
  id            uuid      PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid      NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Core goal definition
  title         text      NOT NULL,
  description   text,
  goal_type     text      NOT NULL DEFAULT 'custom'
                            CHECK (goal_type IN (
                              'revenue', 'clients', 'leads',
                              'sales_calls', 'content', 'hours', 'custom'
                            )),

  -- For connected types (revenue/clients/leads/sales_calls/content/hours):
  --   current_value is computed dynamically from business_metrics — NOT stored here.
  -- For 'custom' type:
  --   current_value is stored here and manually maintained.
  target_value  numeric   NOT NULL CHECK (target_value > 0),
  current_value numeric   NOT NULL DEFAULT 0 CHECK (current_value >= 0),
  unit          text,                          -- e.g. 'clients', '₹', 'hours'

  -- Date bounds (both optional, but needed for on-track forecasting)
  start_date    date,
  target_date   date,

  -- Status and priority
  status        text      NOT NULL DEFAULT 'active'
                            CHECK (status IN ('active', 'completed', 'paused', 'abandoned')),
  priority      text      NOT NULL DEFAULT 'normal'
                            CHECK (priority IN ('critical', 'high', 'normal')),

  -- Timestamps
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  completed_at  timestamptz            -- auto-set by trigger when status = 'completed'
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS business_goals_user_id_idx
  ON public.business_goals (user_id);

CREATE INDEX IF NOT EXISTS business_goals_user_status_idx
  ON public.business_goals (user_id, status);

CREATE INDEX IF NOT EXISTS business_goals_priority_date_idx
  ON public.business_goals (user_id, priority, target_date NULLS LAST);

-- ── RLS: business_goals ──────────────────────────────────────

ALTER TABLE public.business_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "business_goals_select_own"
  ON public.business_goals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "business_goals_insert_own"
  ON public.business_goals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "business_goals_update_own"
  ON public.business_goals FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "business_goals_delete_own"
  ON public.business_goals FOR DELETE
  USING (auth.uid() = user_id);

-- ── Trigger: auto-manage updated_at + completed_at ───────────

CREATE OR REPLACE FUNCTION public.update_business_goal_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();

  -- Auto-set completed_at when status first becomes 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN
    NEW.completed_at = now();
  END IF;

  -- Clear completed_at if status moves away from 'completed'
  IF NEW.status != 'completed' AND OLD.status = 'completed' THEN
    NEW.completed_at = NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER business_goals_updated_at
  BEFORE UPDATE ON public.business_goals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_business_goal_timestamp();


-- ── TABLE: weekly_reviews ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.weekly_reviews (
  id                 uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            uuid    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Monday–Sunday boundaries (always explicit dates, never computed on-the-fly)
  week_start         date    NOT NULL,   -- Monday
  week_end           date    NOT NULL,   -- Sunday

  -- Performance numbers — auto-populated from business_metrics on load.
  -- Refreshed on each draft open. Frozen once status = 'completed'.
  leads              integer NOT NULL DEFAULT 0,
  sales_calls        integer NOT NULL DEFAULT 0,
  clients_closed     integer NOT NULL DEFAULT 0,
  revenue            numeric NOT NULL DEFAULT 0,
  content_posted     integer NOT NULL DEFAULT 0,
  hours_worked       numeric NOT NULL DEFAULT 0,

  -- Operator debrief fields — all optional, qualitative only
  biggest_win        text,
  biggest_failure    text,
  what_worked        text,
  what_did_not_work  text,
  key_learning       text,
  bottleneck         text,
  next_week_priority text,   -- THE most important output of the review
  next_week_action   text,   -- THE concrete next step
  notes              text,

  -- Status
  status             text    NOT NULL DEFAULT 'draft'
                               CHECK (status IN ('draft', 'completed')),

  -- Timestamps
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  completed_at       timestamptz,

  -- One review record per user per week
  CONSTRAINT weekly_reviews_user_week_key UNIQUE (user_id, week_start)
);

-- Indexes
CREATE INDEX IF NOT EXISTS weekly_reviews_user_id_idx
  ON public.weekly_reviews (user_id);

CREATE INDEX IF NOT EXISTS weekly_reviews_user_week_idx
  ON public.weekly_reviews (user_id, week_start DESC);

-- ── RLS: weekly_reviews ───────────────────────────────────────

ALTER TABLE public.weekly_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "weekly_reviews_select_own"
  ON public.weekly_reviews FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "weekly_reviews_insert_own"
  ON public.weekly_reviews FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "weekly_reviews_update_own"
  ON public.weekly_reviews FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "weekly_reviews_delete_own"
  ON public.weekly_reviews FOR DELETE
  USING (auth.uid() = user_id);

-- ── Trigger: auto-manage updated_at + completed_at ───────────

CREATE OR REPLACE FUNCTION public.update_weekly_review_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();

  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN
    NEW.completed_at = now();
  END IF;

  IF NEW.status != 'completed' AND OLD.status = 'completed' THEN
    NEW.completed_at = NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER weekly_reviews_updated_at
  BEFORE UPDATE ON public.weekly_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_weekly_review_timestamp();
