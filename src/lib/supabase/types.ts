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

// ---- UI-only types ----

export interface LevelInfo {
  level: number;
  title: string;
  xpRequired: number;
  perks: string;
}
