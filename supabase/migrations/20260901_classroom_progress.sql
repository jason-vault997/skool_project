-- ============================================================
-- BUILD100 — Phase 3: Classroom Progress Table
-- Run in Supabase SQL Editor AFTER the Phase 2 migration.
-- https://supabase.com/dashboard/project/tnzlmlpmjslcpeusccvz/sql/new
-- ============================================================

create table if not exists public.classroom_progress (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  lesson_id    text not null,          -- matches CMS lesson slug id
  progress_pct integer not null default 0 check (progress_pct >= 0 and progress_pct <= 100),
  completed    boolean not null default false,
  last_pos_sec integer not null default 0,
  completed_at timestamptz,
  updated_at   timestamptz not null default now(),
  unique(user_id, lesson_id)
);

create index if not exists classroom_progress_user_idx on public.classroom_progress(user_id);
create index if not exists classroom_progress_lesson_idx on public.classroom_progress(lesson_id);

create trigger classroom_progress_updated_at
  before update on public.classroom_progress
  for each row execute function public.handle_updated_at();

alter table public.classroom_progress enable row level security;

create policy "classroom_progress: users manage own"
  on public.classroom_progress
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

grant select, insert, update, delete on public.classroom_progress to authenticated;
