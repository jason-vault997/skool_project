-- ============================================================
-- BUILD100 — Phase 4: Application Engine
-- Migration: 20260901_application_engine.sql
-- Creates the application_records table with RLS.
-- Run once in Supabase SQL Editor.
-- ============================================================

-- ── Application status enum-like check ──────────────────────
-- Using text with CHECK constraint keeps it simple and flexible.
-- Valid statuses: 'Not Started' | 'In Progress' | 'Completed' | 'Failed' | 'Skipped'

CREATE TABLE IF NOT EXISTS public.application_records (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id     text NOT NULL,           -- matches CMS slug e.g. 'sales-mindset-clarity-closes'

  -- LEARN section
  notes         text,                    -- "What did I learn?"
  key_concepts  text,                    -- Key concepts to remember
  importance    text,                    -- "What actually matters?"

  -- APPLY section
  mission       text,                    -- "What am I going to do with it?"
  commitment    text,                    -- "What specifically am I committing to?"
  experiment    text,                    -- "What am I testing?" (optional)

  -- RESULT section
  status        text NOT NULL DEFAULT 'Not Started'
                  CHECK (status IN ('Not Started', 'In Progress', 'Completed', 'Failed', 'Skipped')),
  outcome       text,                    -- "What happened?"

  -- REFLECT section
  reflection    text,                    -- "What did I learn from applying this?"
  review_date   date,                    -- When to revisit this

  -- Timestamps
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  completed_at  timestamptz,             -- Set when status = 'Completed'

  -- One application record per user per lesson
  CONSTRAINT application_records_user_lesson_key UNIQUE (user_id, lesson_id)
);

-- ── Performance index ────────────────────────────────────────
CREATE INDEX IF NOT EXISTS application_records_user_id_idx
  ON public.application_records (user_id);

CREATE INDEX IF NOT EXISTS application_records_status_idx
  ON public.application_records (user_id, status);

-- ── Row Level Security ───────────────────────────────────────
ALTER TABLE public.application_records ENABLE ROW LEVEL SECURITY;

-- Users can only read their own records
CREATE POLICY "application_records_select_own"
  ON public.application_records
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own records
CREATE POLICY "application_records_insert_own"
  ON public.application_records
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own records
CREATE POLICY "application_records_update_own"
  ON public.application_records
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own records
CREATE POLICY "application_records_delete_own"
  ON public.application_records
  FOR DELETE
  USING (auth.uid() = user_id);

-- ── Auto-update updated_at on change ────────────────────────
CREATE OR REPLACE FUNCTION public.update_application_record_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  -- Auto-set completed_at when status flips to Completed
  IF NEW.status = 'Completed' AND OLD.status != 'Completed' THEN
    NEW.completed_at = now();
  END IF;
  -- Clear completed_at if status moves away from Completed
  IF NEW.status != 'Completed' AND OLD.status = 'Completed' THEN
    NEW.completed_at = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER application_records_updated_at
  BEFORE UPDATE ON public.application_records
  FOR EACH ROW
  EXECUTE FUNCTION public.update_application_record_timestamp();
