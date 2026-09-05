// ============================================================
// BUILD100 — Supabase Database TypeScript Definitions
// Hand-authored to match the Phase 2 migration schema exactly.
// ============================================================

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

// ---- Row types (what you get back from SELECT) ----

export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  level: number;
  xp: number;
  streak_days: number;
  created_at: string;
  updated_at: string;
}

export interface Track {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sort_order: number;
  created_at: string;
}

export interface Module {
  id: string;
  track_id: string;
  title: string;
  slug: string;
  description: string | null;
  thumbnail_url: string | null;
  sort_order: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface Lesson {
  id: string;
  module_id: string;
  title: string;
  description: string | null;
  video_url: string | null;
  video_provider: string;
  duration_seconds: number | null;
  sort_order: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface LessonProgress {
  id: string;
  user_id: string;
  lesson_id: string;
  progress_percent: number;
  completed: boolean;
  last_position_seconds: number;
  completed_at: string | null;
  updated_at: string;
}

export interface Session {
  id: string;
  title: string;
  description: string | null;
  coach_name: string | null;
  session_type: string;
  start_time: string;
  end_time: string | null;
  meeting_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface SessionAttendance {
  id: string;
  user_id: string;
  session_id: string;
  attended: boolean;
  completed: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface BusinessMetric {
  id: string;
  user_id: string;
  date: string;
  leads: number;
  sales_calls: number;
  clients_closed: number;
  revenue: number;
  content_posted: number;
  hours_worked: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface XpEvent {
  id: string;
  user_id: string;
  event_type: string;
  xp_amount: number;
  reference_type: string | null;
  reference_id: string | null;
  created_at: string;
}

// ---- Insert types (what you send on INSERT) ----

export type ProfileInsert = Omit<Profile, 'created_at' | 'updated_at'> & {
  created_at?: string;
  updated_at?: string;
};

export type BusinessMetricInsert = Omit<BusinessMetric, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

export type XpEventInsert = Omit<XpEvent, 'id' | 'created_at'> & {
  id?: string;
  created_at?: string;
};

// ---- Module with join ----

export interface ModuleWithTrack extends Module {
  tracks: Pick<Track, 'name' | 'slug'>;
}

// ---- Aggregated types used in the UI ----

export interface TrackWithModules extends Track {
  modules: Module[];
}

export interface ModuleWithProgress extends Module {
  progress: number;           // 0–100
  completedLessons: number;
  totalLessons: number;
  trackName: string;
  trackSlug: string;
}

export interface AllTimeBusinessStats {
  totalLeads: number;
  totalSalesCalls: number;
  totalClientsClosed: number;
  totalRevenue: number;
  totalContentPosted: number;
  totalHoursWorked: number;
}

export interface XpBreakdown {
  execution: number;
  application: number;
  business: number;
  total: number;
}

// ---- Database shape (for createClient generic) ----

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: ProfileInsert;
        Update: Partial<ProfileInsert>;
      };
      tracks: {
        Row: Track;
        Insert: Omit<Track, 'id' | 'created_at'> & { id?: string; created_at?: string };
        Update: Partial<Track>;
      };
      modules: {
        Row: Module;
        Insert: Omit<Module, 'id' | 'created_at' | 'updated_at'> & { id?: string; created_at?: string; updated_at?: string };
        Update: Partial<Module>;
      };
      lessons: {
        Row: Lesson;
        Insert: Omit<Lesson, 'id' | 'created_at' | 'updated_at'> & { id?: string; created_at?: string; updated_at?: string };
        Update: Partial<Lesson>;
      };
      lesson_progress: {
        Row: LessonProgress;
        Insert: Omit<LessonProgress, 'id' | 'updated_at'> & { id?: string; updated_at?: string };
        Update: Partial<LessonProgress>;
      };
      sessions: {
        Row: Session;
        Insert: Omit<Session, 'id' | 'created_at' | 'updated_at'> & { id?: string; created_at?: string; updated_at?: string };
        Update: Partial<Session>;
      };
      session_attendance: {
        Row: SessionAttendance;
        Insert: Omit<SessionAttendance, 'id' | 'created_at' | 'updated_at'> & { id?: string; created_at?: string; updated_at?: string };
        Update: Partial<SessionAttendance>;
      };
      business_metrics: {
        Row: BusinessMetric;
        Insert: BusinessMetricInsert;
        Update: Partial<BusinessMetricInsert>;
      };
      xp_events: {
        Row: XpEvent;
        Insert: XpEventInsert;
        Update: Partial<XpEventInsert>;
      };
    };
  };
}

// ---- Phase 4: Application Engine ----

export type ApplicationStatus =
  | 'Not Started'
  | 'In Progress'
  | 'Completed'
  | 'Failed'
  | 'Skipped';

export const APPLICATION_STATUSES: ApplicationStatus[] = [
  'Not Started',
  'In Progress',
  'Completed',
  'Failed',
  'Skipped',
];

export interface ApplicationRecord {
  id: string;
  user_id: string;
  lesson_id: string;
  notes: string | null;
  key_concepts: string | null;
  importance: string | null;
  mission: string | null;
  commitment: string | null;
  experiment: string | null;
  status: ApplicationStatus;
  outcome: string | null;
  reflection: string | null;
  review_date: string | null;   // 'YYYY-MM-DD'
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export type ApplicationRecordInsert = Omit<ApplicationRecord, 'id' | 'created_at' | 'updated_at' | 'completed_at'> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
  completed_at?: string | null;
};

/** UI-derived status of a lesson's application — used for sidebar indicators */
export type AppIndicatorStatus = 'none' | 'started' | 'completed' | 'failed';

export interface LevelInfo {
  level: number;
  title: string;
  xpRequired: number;
  perks: string;
}

// ---- Phase 6: Business Operating System ----

export type GoalType     = 'revenue' | 'clients' | 'leads' | 'sales_calls' | 'content' | 'hours' | 'custom';
export type GoalStatus   = 'active' | 'completed' | 'paused' | 'abandoned';
export type GoalPriority = 'critical' | 'high' | 'normal';
export type ReviewStatus = 'draft' | 'completed';

export interface BusinessGoal {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  goal_type: GoalType;
  /** For connected types, this is NOT the source of truth — use calcConnectedCurrentValue() */
  target_value: number;
  /** Only used for 'custom' goal_type. Connected types compute this from business_metrics. */
  current_value: number;
  unit: string | null;
  start_date: string | null;   // 'YYYY-MM-DD'
  target_date: string | null;  // 'YYYY-MM-DD'
  status: GoalStatus;
  priority: GoalPriority;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export type BusinessGoalInsert = Omit<BusinessGoal, 'id' | 'created_at' | 'updated_at' | 'completed_at'> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
  completed_at?: string | null;
};

export interface WeeklyReview {
  id: string;
  user_id: string;
  week_start: string;    // 'YYYY-MM-DD' — always Monday
  week_end: string;      // 'YYYY-MM-DD' — always Sunday

  // Auto-populated from business_metrics (read-only in UI)
  leads: number;
  sales_calls: number;
  clients_closed: number;
  revenue: number;
  content_posted: number;
  hours_worked: number;

  // Operator debrief fields
  biggest_win: string | null;
  biggest_failure: string | null;
  what_worked: string | null;
  what_did_not_work: string | null;
  key_learning: string | null;
  bottleneck: string | null;
  next_week_priority: string | null;
  next_week_action: string | null;
  notes: string | null;

  status: ReviewStatus;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

// ---- Phase 9–12: Calendar + Business Restructuring ----

/**
 * operator_config — single row per user.
 * Stores operating period config, acquisition targets, job application count,
 * and the canonical user timezone for all Calendar date calculations.
 */
export interface OperatorConfig {
  user_id: string;
  /** IANA timezone identifier (e.g. 'Asia/Kolkata'). Set from browser on first use. */
  timezone: string;
  /** 'YYYY-MM-DD' — the date the operator designated as Day 1. */
  operating_start_date: string | null;
  /** 'YYYY-MM-DD' — optional operating end date. */
  operating_end_date: string | null;
  // Primary acquisition engine targets (units/day, null = no target set)
  acquisition_repost_target: number | null;
  acquisition_content_target: number | null;
  acquisition_brand_target: number | null;
  // Delegated acquisition targets
  acquisition_wa_target: number | null;
  acquisition_linkedin_target: number | null;
  acquisition_repost_d_target: number | null;
  /** Cumulative job application count (simple counter). */
  job_application_count: number;
  created_at: string;
  updated_at: string;
}

export type OperatorConfigUpsert = Omit<OperatorConfig, 'created_at' | 'updated_at'> & {
  created_at?: string;
  updated_at?: string;
};

/**
 * operating_days — one row per operating date per user.
 * Canonical operating-day state. Streak and day-number are derived from this table.
 * 'date' is a local calendar date in the user's configured timezone.
 */
export type OperatingDayStatus = 'not_started' | 'started' | 'completed' | 'missed';

export interface OperatingDay {
  id: string;
  user_id: string;
  /** 'YYYY-MM-DD' in user's timezone — the operating date */
  date: string;
  status: OperatingDayStatus;
  /** Cached sum of work minutes for this day. Updated on check-out / session end. */
  total_work_minutes: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type OperatingDayInsert = Omit<OperatingDay, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

/**
 * work_sessions — individual check-in to check-out intervals.
 * Supports multiple sessions per day, breaks, and overnight sessions.
 * ended_at = null means the session is currently active.
 * work_minutes = null means the session is not yet closed.
 */
export interface WorkSession {
  id: string;
  user_id: string;
  /** 'YYYY-MM-DD' — attributed to the local date on which check-in occurred */
  operating_date: string;
  started_at: string;  // ISO timestamptz
  ended_at: string | null;
  /** Denormalized cache: total break minutes in this session. Source of truth = work_breaks. */
  break_minutes: number;
  /** Computed on check-out: floor((ended_at - started_at - break_minutes) / 60) */
  work_minutes: number | null;
  created_at: string;
  updated_at: string;
}

export type WorkSessionInsert = Omit<WorkSession, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

/**
 * work_breaks — individual break intervals within a work session.
 * Source of truth for break duration. ended_at = null = currently on break.
 * Canon: actual_work = (session.ended_at - session.started_at) - SUM(break.ended_at - break.started_at)
 */
export interface WorkBreak {
  id: string;
  work_session_id: string;
  user_id: string;
  started_at: string;  // ISO timestamptz
  ended_at: string | null;
  created_at: string;
}

export type WorkBreakInsert = Omit<WorkBreak, 'id' | 'created_at'> & {
  id?: string;
  created_at?: string;
};

/**
 * daily_execution_items — up to 3 completed items per operating day.
 * slot: 1 | 2 | 3
 */
export interface DailyExecutionItem {
  id: string;
  user_id: string;
  /** 'YYYY-MM-DD' local operating date */
  date: string;
  slot: 1 | 2 | 3;
  text: string;
  completed: boolean;
  created_at: string;
  updated_at: string;
}

export type DailyExecutionItemInsert = Omit<DailyExecutionItem, 'id' | 'created_at' | 'updated_at'> & {
  id?: string;
  created_at?: string;
  updated_at?: string;
};

/**
 * acquisition_log — daily execution boolean per acquisition engine.
 * engine values: 'repost' | 'content' | 'brand' | 'wa_dms' | 'linkedin' | 'repost_d'
 * Primary engines: repost, content, brand
 * Delegated engines: wa_dms, linkedin, repost_d
 */
export type AcquisitionEngine =
  | 'repost'
  | 'content'
  | 'brand'
  | 'wa_dms'
  | 'linkedin'
  | 'repost_d';

export interface AcquisitionLog {
  id: string;
  user_id: string;
  /** 'YYYY-MM-DD' local date */
  date: string;
  engine: AcquisitionEngine;
  executed: boolean;
  created_at: string;
}

export type AcquisitionLogInsert = Omit<AcquisitionLog, 'id' | 'created_at'> & {
  id?: string;
  created_at?: string;
};


