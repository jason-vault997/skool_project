-- ============================================================
-- BUILD100 — Phase 2 Database Migration
-- Run this once in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/tnzlmlpmjslcpeusccvz/sql/new
-- ============================================================

-- Enable pgcrypto for gen_random_uuid()
create extension if not exists "pgcrypto";

-- ============================================================
-- HELPER: auto-update updated_at timestamps
-- ============================================================
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================
-- TABLE: profiles
-- One row per authenticated user. UUID matches auth.users.id
-- ============================================================
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  full_name    text,
  avatar_url   text,
  level        integer not null default 1,
  xp           integer not null default 0,
  streak_days  integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.handle_updated_at();

-- ============================================================
-- TABLE: tracks
-- Top-level curriculum tracks (Sales, Content, Offer)
-- ============================================================
create table if not exists public.tracks (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  description text,
  sort_order  integer not null,
  created_at  timestamptz not null default now()
);

create index if not exists tracks_sort_order_idx on public.tracks(sort_order);

-- ============================================================
-- TABLE: modules
-- Curriculum modules belonging to a track
-- ============================================================
create table if not exists public.modules (
  id           uuid primary key default gen_random_uuid(),
  track_id     uuid not null references public.tracks(id) on delete cascade,
  title        text not null,
  slug         text not null,
  description  text,
  thumbnail_url text,
  sort_order   integer not null,
  is_published boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique(track_id, slug)
);

create index if not exists modules_track_id_idx on public.modules(track_id);
create index if not exists modules_sort_order_idx on public.modules(sort_order);

create trigger modules_updated_at
  before update on public.modules
  for each row execute function public.handle_updated_at();

-- ============================================================
-- TABLE: lessons
-- Individual lessons inside a module
-- ============================================================
create table if not exists public.lessons (
  id               uuid primary key default gen_random_uuid(),
  module_id        uuid not null references public.modules(id) on delete cascade,
  title            text not null,
  description      text,
  video_url        text,
  video_provider   text not null default 'youtube',
  duration_seconds integer,
  sort_order       integer not null,
  is_published     boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists lessons_module_id_idx on public.lessons(module_id);

create trigger lessons_updated_at
  before update on public.lessons
  for each row execute function public.handle_updated_at();

-- ============================================================
-- TABLE: lesson_progress
-- Per-user per-lesson progress tracking
-- ============================================================
create table if not exists public.lesson_progress (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references auth.users(id) on delete cascade,
  lesson_id            uuid not null references public.lessons(id) on delete cascade,
  progress_percent     integer not null default 0,
  completed            boolean not null default false,
  last_position_seconds integer not null default 0,
  completed_at         timestamptz,
  updated_at           timestamptz not null default now(),
  unique(user_id, lesson_id)
);

create index if not exists lesson_progress_user_idx on public.lesson_progress(user_id);
create index if not exists lesson_progress_lesson_idx on public.lesson_progress(lesson_id);

create trigger lesson_progress_updated_at
  before update on public.lesson_progress
  for each row execute function public.handle_updated_at();

-- ============================================================
-- TABLE: sessions
-- Live Build100 training sessions
-- ============================================================
create table if not exists public.sessions (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  description  text,
  coach_name   text,
  session_type text not null,
  start_time   timestamptz not null,
  end_time     timestamptz,
  meeting_url  text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists sessions_start_time_idx on public.sessions(start_time);

create trigger sessions_updated_at
  before update on public.sessions
  for each row execute function public.handle_updated_at();

-- ============================================================
-- TABLE: session_attendance
-- Per-user attendance tracking for each session
-- ============================================================
create table if not exists public.session_attendance (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null references public.sessions(id) on delete cascade,
  attended   boolean not null default false,
  completed  boolean not null default false,
  notes      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, session_id)
);

create index if not exists session_attendance_user_idx on public.session_attendance(user_id);

create trigger session_attendance_updated_at
  before update on public.session_attendance
  for each row execute function public.handle_updated_at();

-- ============================================================
-- TABLE: business_metrics
-- Daily business activity log (one row per user per day)
-- ============================================================
create table if not exists public.business_metrics (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  date            date not null,
  leads           integer not null default 0,
  sales_calls     integer not null default 0,
  clients_closed  integer not null default 0,
  revenue         numeric(12, 2) not null default 0,
  content_posted  integer not null default 0,
  hours_worked    numeric(5, 2) not null default 0,
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique(user_id, date)
);

create index if not exists business_metrics_user_idx on public.business_metrics(user_id);
create index if not exists business_metrics_date_idx on public.business_metrics(date);

create trigger business_metrics_updated_at
  before update on public.business_metrics
  for each row execute function public.handle_updated_at();

-- ============================================================
-- TABLE: xp_events
-- Auditable XP ledger — every XP award is recorded here
-- ============================================================
create table if not exists public.xp_events (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  event_type     text not null,
  xp_amount      integer not null,
  reference_type text,
  reference_id   uuid,
  created_at     timestamptz not null default now()
);

create index if not exists xp_events_user_idx on public.xp_events(user_id);
create index if not exists xp_events_event_type_idx on public.xp_events(event_type);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- Enable RLS on all tables
alter table public.profiles           enable row level security;
alter table public.tracks             enable row level security;
alter table public.modules            enable row level security;
alter table public.lessons            enable row level security;
alter table public.lesson_progress    enable row level security;
alter table public.sessions           enable row level security;
alter table public.session_attendance enable row level security;
alter table public.business_metrics   enable row level security;
alter table public.xp_events          enable row level security;

-- ---- Profiles: users can only see/edit their own profile ----
create policy "profiles: users manage own"
  on public.profiles
  for all
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- ---- Tracks: all authenticated users can read ----
create policy "tracks: authenticated read"
  on public.tracks
  for select
  to authenticated
  using (true);

-- ---- Modules: all authenticated users can read ----
create policy "modules: authenticated read"
  on public.modules
  for select
  to authenticated
  using (true);

-- ---- Lessons: all authenticated users can read ----
create policy "lessons: authenticated read"
  on public.lessons
  for select
  to authenticated
  using (true);

-- ---- Lesson Progress: users manage only their own ----
create policy "lesson_progress: users manage own"
  on public.lesson_progress
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ---- Sessions: all authenticated users can read ----
create policy "sessions: authenticated read"
  on public.sessions
  for select
  to authenticated
  using (true);

-- ---- Session Attendance: users manage only their own ----
create policy "session_attendance: users manage own"
  on public.session_attendance
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ---- Business Metrics: users manage only their own ----
create policy "business_metrics: users manage own"
  on public.business_metrics
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ---- XP Events: users can read their own; insert only via server ----
create policy "xp_events: users read own"
  on public.xp_events
  for select
  to authenticated
  using (user_id = auth.uid());

create policy "xp_events: users insert own"
  on public.xp_events
  for insert
  to authenticated
  with check (user_id = auth.uid());

-- ============================================================
-- GRANTS
-- ============================================================
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.profiles to authenticated;
grant select on public.tracks to authenticated;
grant select on public.modules to authenticated;
grant select on public.lessons to authenticated;
grant select, insert, update, delete on public.lesson_progress to authenticated;
grant select on public.sessions to authenticated;
grant select, insert, update, delete on public.session_attendance to authenticated;
grant select, insert, update, delete on public.business_metrics to authenticated;
grant select, insert on public.xp_events to authenticated;

-- ============================================================
-- TRIGGER: auto-create profile on new auth user
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- SEED DATA: Curriculum Structure
-- ============================================================

-- Tracks
insert into public.tracks (id, name, slug, description, sort_order) values
  ('00000000-0000-0000-0000-000000000001', 'Sales',   'sales',   'Cold calling, discovery, objection handling, and closing frameworks.', 1),
  ('00000000-0000-0000-0000-000000000002', 'Content', 'content', 'Short-form content engine, personal brand, and distribution leverage.',  2),
  ('00000000-0000-0000-0000-000000000003', 'Offer',   'offer',   'Irresistible offer architecture, pricing psychology, and B2B pipelines.', 3)
on conflict (slug) do nothing;

-- Modules — Sales Track
insert into public.modules (id, track_id, title, slug, description, thumbnail_url, sort_order, is_published) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001',
   'Cold Calling Module', 'cold-calling',
   'Live unedited calls, tone calibration and rapid hook drills.',
   '/assets/cold-calling-full.png', 1, true),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001',
   'Sales Calls', 'sales-calls',
   'Discovery, diagnostic framing and running 45-min close calls.',
   '/assets/course-sales.png', 2, true),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001',
   'Objection Handling', 'objection-handling',
   'Real-time responses to Too expensive, Send info, Think about it.',
   '/assets/course-sales.png', 3, true),
  ('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001',
   'Sales Frameworks', 'sales-frameworks',
   'End-to-end closing blueprints and qualification matrices.',
   '/assets/course-sales.png', 4, true)
on conflict (track_id, slug) do nothing;

-- Modules — Content Track
insert into public.modules (id, track_id, title, slug, description, thumbnail_url, sort_order, is_published) values
  ('10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000002',
   'Content Engine', 'content-engine',
   'High-volume short form and repurposing systems for inbound lead flow.',
   '/assets/course-content.png', 1, true),
  ('10000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000002',
   'Personal Brand', 'personal-brand',
   'Founder credibility, positioning and distribution leverage.',
   '/assets/course-content.png', 2, true)
on conflict (track_id, slug) do nothing;

-- Modules — Offer Track
insert into public.modules (id, track_id, title, slug, description, thumbnail_url, sort_order, is_published) values
  ('10000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000003',
   'Offer Fundamentals', 'offer-fundamentals',
   'Irresistible grand slam offer architecture and pricing psychology.',
   '/assets/course-offer.png', 1, true),
  ('10000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000003',
   'Business Acquisition', 'business-acquisition',
   'B2B client pipelines, outbound scripts and retention infrastructure.',
   '/assets/course-offer.png', 2, true)
on conflict (track_id, slug) do nothing;

-- ============================================================
-- END OF MIGRATION
-- ============================================================
