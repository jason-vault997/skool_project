-- ============================================================
-- BUILD100 — Phase 9–12: Calendar + Business Restructuring
-- Migration: 6 New Tables (additive only — no existing tables modified)
--
-- Run this in your Supabase SQL editor (Dashboard → SQL Editor).
-- All tables use Row Level Security (RLS) — same pattern as existing tables.
-- ============================================================

-- 1. operator_config
-- Single row per user. Stores timezone, operating period, acquisition targets,
-- job application count. The timezone field is mandatory for all Calendar
-- date calculations.

CREATE TABLE IF NOT EXISTS operator_config (
  user_id                    uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  timezone                   text NOT NULL DEFAULT 'UTC',        -- IANA timezone (e.g. 'Asia/Kolkata')
  operating_start_date       date,                               -- 'YYYY-MM-DD' — Day 1
  operating_end_date         date,                               -- optional end date
  acquisition_repost_target  integer,                            -- primary engine daily targets
  acquisition_content_target integer,
  acquisition_brand_target   integer,
  acquisition_wa_target      integer,                            -- delegated acquisition targets
  acquisition_linkedin_target integer,
  acquisition_repost_d_target integer,
  job_application_count      integer NOT NULL DEFAULT 0,
  created_at                 timestamptz NOT NULL DEFAULT now(),
  updated_at                 timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE operator_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own operator_config"
  ON operator_config FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 2. operating_days
-- One row per operating date per user.
-- The canonical source of truth for operating-day state, streak, and day numbers.
-- 'date' is stored as a local calendar date in the user's configured timezone.

CREATE TABLE IF NOT EXISTS operating_days (
  id                  uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id             uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date                date NOT NULL,                              -- local operating date
  status              text NOT NULL DEFAULT 'not_started'        -- not_started | started | completed | missed
                      CHECK (status IN ('not_started', 'started', 'completed', 'missed')),
  total_work_minutes  integer NOT NULL DEFAULT 0,                -- cached sum, source of truth = work_sessions
  notes               text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, date)
);

ALTER TABLE operating_days ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own operating_days"
  ON operating_days FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 3. work_sessions
-- Individual check-in → check-out intervals.
-- Supports multiple sessions per day, breaks, and overnight sessions.
-- ended_at = null means the session is currently active.
-- work_minutes = null means the session is not yet closed.
-- Overnight sessions remain attributed to the operating_date of check-in.

CREATE TABLE IF NOT EXISTS work_sessions (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  operating_date   date NOT NULL,                                 -- attributed to this local date
  started_at       timestamptz NOT NULL,
  ended_at         timestamptz,                                   -- null = active
  break_minutes    integer NOT NULL DEFAULT 0,                    -- denormalized cache from work_breaks
  work_minutes     integer,                                       -- computed on check-out
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE work_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own work_sessions"
  ON work_sessions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 4. work_breaks
-- Individual break intervals within a work session.
-- SOURCE OF TRUTH for break duration calculation.
-- ended_at = null means currently on break.
-- Canonical work time formula:
--   actual_work = (session.ended_at - session.started_at) - SUM(break.ended_at - break.started_at)
-- work_sessions.break_minutes is a denormalized cache ONLY — never the source of truth.

CREATE TABLE IF NOT EXISTS work_breaks (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  work_session_id  uuid NOT NULL REFERENCES work_sessions(id) ON DELETE CASCADE,
  user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  started_at       timestamptz NOT NULL,
  ended_at         timestamptz,                                   -- null = currently on break
  created_at       timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE work_breaks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own work_breaks"
  ON work_breaks FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 5. daily_execution_items
-- Up to 3 simple completion items per operating day.
-- slot = 1, 2, or 3.

CREATE TABLE IF NOT EXISTS daily_execution_items (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date        date NOT NULL,
  slot        smallint NOT NULL CHECK (slot BETWEEN 1 AND 3),
  text        text NOT NULL DEFAULT '',
  completed   boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, date, slot)
);

ALTER TABLE daily_execution_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own daily_execution_items"
  ON daily_execution_items FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 6. acquisition_log
-- Daily execution boolean per acquisition engine.
-- Engine values: 'repost' | 'content' | 'brand' | 'wa_dms' | 'linkedin' | 'repost_d'
-- Primary engines: repost, content, brand
-- Delegated engines: wa_dms, linkedin, repost_d

CREATE TABLE IF NOT EXISTS acquisition_log (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date        date NOT NULL,
  engine      text NOT NULL
              CHECK (engine IN ('repost', 'content', 'brand', 'wa_dms', 'linkedin', 'repost_d')),
  executed    boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, date, engine)
);

ALTER TABLE acquisition_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own acquisition_log"
  ON acquisition_log FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- IMPORTANT NOTES
-- ============================================================
-- 1. No existing tables are modified. All 6 tables are additive.
-- 2. business_metrics.hours_worked remains the canonical daily hours
--    for Analytics/Operator. The Calendar layer will auto-write this
--    field when a day is checked out (via upsert in the app layer).
-- 3. clients_closed in business_metrics remains the CANONICAL source
--    for client count. The "+ Add Client" UI increments this field.
--    No second client table is created.
-- 4. profiles.streak_days will be synced from operating_days data
--    by the app layer on each operating-day state change, preserving
--    compatibility with Dashboard/Leaderboard components.
-- ============================================================
