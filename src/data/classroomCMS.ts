// ============================================================
// BUILD100 — Classroom CMS Data Model
// Single source of truth for all curriculum content.
// To add a lesson: add an entry to the relevant module.
// To add a video: set videoId to the YouTube video ID string.
// videoId: null = "Video coming soon" placeholder in the player.
// ============================================================

export interface ClassroomLesson {
  id: string;                   // Stable slug — used as primary key in classroom_progress
  title: string;
  videoId: string | null;       // YouTube video ID only (not full URL)
  durationSeconds: number | null;
  transcript: string | null;
}

export interface ClassroomModule {
  id: string;
  title: string;
  lessons: ClassroomLesson[];
}

export interface ClassroomBlock {
  id: string;
  title: string;
  slug: string;
  type: 'structured' | 'recordings';
  sortOrder: number;
  modules: ClassroomModule[];
}

// ============================================================
// CURRICULUM DATA
// Order: Sales → Content Creation → Offer Creation →
//        Unedited Recordings → Cold Calling
// ============================================================

export const CLASSROOM_DATA: ClassroomBlock[] = [

  // ================================================================
  // 1. SALES
  // ================================================================
  {
    id: 'sales',
    title: 'Sales',
    slug: 'sales',
    type: 'structured',
    sortOrder: 1,
    modules: [
      {
        id: 'sales-mindset',
        title: 'Mindset',
        lessons: [
          { id: 'sales-mindset-why-80-percent', title: 'Why 80% of Your Day Is Bullshit', videoId: null, durationSeconds: null, transcript: null },
          { id: 'sales-mindset-feature-not-bug', title: 'Feature Not a Bug', videoId: null, durationSeconds: null, transcript: null },
          { id: 'sales-mindset-clarity-closes', title: 'Clarity Closes Every Sale', videoId: null, durationSeconds: null, transcript: null },
          { id: 'sales-mindset-why-people-buy', title: 'Why People Buy From You', videoId: null, durationSeconds: null, transcript: null },
          { id: 'sales-mindset-clarity-over-convincing', title: 'Clarity Over Convincing', videoId: null, durationSeconds: null, transcript: null },
          { id: 'sales-mindset-refund-policies', title: 'Why Refund Policies Kill Service Businesses', videoId: null, durationSeconds: null, transcript: null },
        ],
      },
      {
        id: 'sales-setup',
        title: 'Setup',
        lessons: [
          { id: 'sales-setup-first-impression', title: 'First Impression on Camera on Sales Calls', videoId: null, durationSeconds: null, transcript: null },
        ],
      },
      {
        id: 'sales-rapport',
        title: 'Rapport',
        lessons: [
          { id: 'sales-rapport-rapport-segway', title: 'Rapport + Segway into Discovery', videoId: null, durationSeconds: null, transcript: null },
          { id: 'sales-rapport-retarded-curiosity', title: 'Retarded Curiosity', videoId: null, durationSeconds: null, transcript: null },
        ],
      },
      {
        id: 'sales-gates',
        title: 'Gates',
        lessons: [
          { id: 'sales-gates-gates-of-hell', title: 'Gates of Hell (Intro + Gate 1)', videoId: null, durationSeconds: null, transcript: null },
          { id: 'sales-gates-gate-2', title: 'Gate 2', videoId: null, durationSeconds: null, transcript: null },
          { id: 'sales-gates-gate-3', title: 'Gate 3', videoId: null, durationSeconds: null, transcript: null },
          { id: 'sales-gates-real-purpose', title: 'The Real Purpose of the 3 Gates', videoId: null, durationSeconds: null, transcript: null },
          { id: 'sales-gates-two-layer-disqualification', title: 'The Two Layer Disqualification Framework', videoId: null, durationSeconds: null, transcript: null },
          { id: 'sales-gates-why-prospects-lie', title: 'Why Prospects Lie About Their Real Problem', videoId: null, durationSeconds: null, transcript: null },
          { id: 'sales-gates-secret-to-opening-up', title: 'The Secret to Getting Prospects to Open Up', videoId: null, durationSeconds: null, transcript: null },
          { id: 'sales-gates-transfer-certainty', title: 'How to Transfer Certainty', videoId: null, durationSeconds: null, transcript: null },
          { id: 'sales-gates-live-demo', title: 'Live Demo', videoId: null, durationSeconds: null, transcript: null },
          { id: 'sales-gates-stop-guaranteeing', title: 'Stop Guaranteeing Results Sell Your Method Instead', videoId: null, durationSeconds: null, transcript: null },
          { id: 'sales-gates-practice-rapport', title: 'Practice - Rapport, Context & Tonal Shifts', videoId: null, durationSeconds: null, transcript: null },
          { id: 'sales-gates-first-30-seconds', title: 'The First 30 Seconds Rule of Opening', videoId: null, durationSeconds: null, transcript: null },
        ],
      },
      {
        id: 'sales-breaking-beliefs',
        title: 'Breaking Beliefs',
        lessons: [
          { id: 'sales-bb-freud', title: "Freud's Id, Ego, Superego", videoId: null, durationSeconds: null, transcript: null },
          { id: 'sales-bb-live-calls', title: 'Handling Prospect Belief Discrepancy in Live Calls', videoId: null, durationSeconds: null, transcript: null },
          { id: 'sales-bb-breaking-before-pitching', title: 'Breaking Prospect Beliefs Before Pitching', videoId: null, durationSeconds: null, transcript: null },
        ],
      },
      {
        id: 'sales-pitch',
        title: 'Pitch',
        lessons: [
          { id: 'sales-pitch-buying-questions', title: 'Using Buying Questions to Know When to Pitch', videoId: null, durationSeconds: null, transcript: null },
          { id: 'sales-pitch-framework', title: 'Sales Pitch Framework', videoId: null, durationSeconds: null, transcript: null },
          { id: 'sales-pitch-triggers', title: 'Triggers & Belief Breaking', videoId: null, durationSeconds: null, transcript: null },
          { id: 'sales-pitch-the-pitch-method', title: 'The Pitch Method', videoId: null, durationSeconds: null, transcript: null },
          { id: 'sales-pitch-the-process', title: 'The Process', videoId: null, durationSeconds: null, transcript: null },
          { id: 'sales-pitch-1', title: 'Pitch 1', videoId: null, durationSeconds: null, transcript: null },
          { id: 'sales-pitch-2', title: 'Pitch 2', videoId: null, durationSeconds: null, transcript: null },
          { id: 'sales-pitch-3', title: 'Pitch 3', videoId: null, durationSeconds: null, transcript: null },
          { id: 'sales-pitch-4', title: 'Pitch 4', videoId: null, durationSeconds: null, transcript: null },
          { id: 'sales-pitch-proposal', title: 'Proposal Process', videoId: null, durationSeconds: null, transcript: null },
        ],
      },
      {
        id: 'sales-close',
        title: 'Close',
        lessons: [
          { id: 'sales-close-value-triangle', title: 'The Value Triangle', videoId: null, durationSeconds: null, transcript: null },
          { id: 'sales-close-1-to-10', title: 'The 1-to-10 Close', videoId: null, durationSeconds: null, transcript: null },
          { id: 'sales-close-hypothetical', title: 'The Hypothetical Close', videoId: null, durationSeconds: null, transcript: null },
          { id: 'sales-close-reeducate', title: 'The Reeducate & Isolation Close', videoId: null, durationSeconds: null, transcript: null },
        ],
      },
      {
        id: 'sales-objections',
        title: 'Objections',
        lessons: [
          { id: 'sales-obj-4-step-framework', title: 'The 4 Step Objection Handling Framework', videoId: null, durationSeconds: null, transcript: null },
          { id: 'sales-obj-psychology', title: 'The Psychology of Objections', videoId: null, durationSeconds: null, transcript: null },
          { id: 'sales-obj-types', title: 'Types of Objections', videoId: null, durationSeconds: null, transcript: null },
        ],
      },
      {
        id: 'sales-lead-gen',
        title: 'Lead Gen',
        lessons: [
          { id: 'sales-leadgen-fundamentals', title: 'Lead Generation Fundamentals', videoId: null, durationSeconds: null, transcript: null },
          { id: 'sales-leadgen-addressable-market', title: 'Defining Your Addressable Market', videoId: null, durationSeconds: null, transcript: null },
          { id: 'sales-leadgen-first-touch', title: 'First Touch Point', videoId: null, durationSeconds: null, transcript: null },
        ],
      },
    ],
  },

  // ================================================================
  // 2. CONTENT CREATION
  // ================================================================
  {
    id: 'content-creation',
    title: 'Content Creation',
    slug: 'content-creation',
    type: 'structured',
    sortOrder: 2,
    modules: [
      {
        id: 'content-core',
        title: 'Content Creation',
        lessons: [
          { id: 'content-message-framework', title: 'The Message Framework', videoId: null, durationSeconds: null, transcript: null },
          { id: 'content-what-you-post', title: 'What You Post Is Not What People See', videoId: null, durationSeconds: null, transcript: null },
          { id: 'content-3-types-retention', title: '3 Types of Retention', videoId: null, durationSeconds: null, transcript: null },
          { id: 'content-science-scripting-1', title: 'The Science of Scripting (Part 1)', videoId: null, durationSeconds: null, transcript: null },
          { id: 'content-science-scripting-2', title: 'The Science of Scripting (Part 2)', videoId: null, durationSeconds: null, transcript: null },
          { id: 'content-body-of-script', title: 'How to Write the Body of a Short Form Script', videoId: null, durationSeconds: null, transcript: null },
        ],
      },
    ],
  },

  // ================================================================
  // 3. OFFER CREATION
  // ================================================================
  {
    id: 'offer-creation',
    title: 'Offer Creation',
    slug: 'offer-creation',
    type: 'structured',
    sortOrder: 3,
    modules: [
      {
        id: 'offer-the-game',
        title: 'The Game',
        lessons: [
          { id: 'offer-game-service-vs-offer', title: 'THE GAME - Service vs Offer', videoId: null, durationSeconds: null, transcript: null },
          { id: 'offer-game-top-1-percent', title: 'How to be Top 1% in market', videoId: null, durationSeconds: null, transcript: null },
          { id: 'offer-game-market-framework', title: 'Market Framework', videoId: null, durationSeconds: null, transcript: null },
          { id: 'offer-game-client-success-framework', title: 'Client Success Framework', videoId: null, durationSeconds: null, transcript: null },
        ],
      },
      {
        id: 'offer-stages-of-business',
        title: 'Stages of a Business',
        lessons: [
          { id: 'offer-stages-stages', title: 'Stages of Business', videoId: null, durationSeconds: null, transcript: null },
          { id: 'offer-stages-first-proof', title: 'QnA - How to Get Your First Proof', videoId: null, durationSeconds: null, transcript: null },
          { id: 'offer-stages-stage-2', title: 'Stage 2 of Business', videoId: null, durationSeconds: null, transcript: null },
          { id: 'offer-stages-stage-3', title: 'Stage 3 of Business', videoId: null, durationSeconds: null, transcript: null },
        ],
      },
      {
        id: 'offer-six-elements',
        title: 'Six Elements of an Offer',
        lessons: [
          { id: 'offer-elem-1-size', title: 'Element 1 - Size of the Problem', videoId: null, durationSeconds: null, transcript: null },
          { id: 'offer-elem-2-duration', title: 'Element 2 - Duration', videoId: null, durationSeconds: null, transcript: null },
          { id: 'offer-elem-3-complexity', title: 'Element 3 - Complexity', videoId: null, durationSeconds: null, transcript: null },
          { id: 'offer-elem-4-skill', title: 'Element 4 - Skill', videoId: null, durationSeconds: null, transcript: null },
          { id: 'offer-elem-5-certainty', title: 'Element 5 - Certainty', videoId: null, durationSeconds: null, transcript: null },
          { id: 'offer-elem-6-speed', title: 'Element 6 - Speed', videoId: null, durationSeconds: null, transcript: null },
        ],
      },
      {
        id: 'offer-client-experience',
        title: 'Client Experience & Success',
        lessons: [
          { id: 'offer-cx-why-important', title: 'Why Customer Experience is so Important', videoId: null, durationSeconds: null, transcript: null },
          { id: 'offer-cx-three-parts', title: 'Three Parts to Client Success', videoId: null, durationSeconds: null, transcript: null },
          { id: 'offer-cx-onboarding', title: 'Creating an onboarding process', videoId: null, durationSeconds: null, transcript: null },
        ],
      },
      {
        id: 'offer-value-ladder',
        title: 'Value Ladder',
        lessons: [
          { id: 'offer-vl-what-is', title: 'What is a Value Ladder?', videoId: null, durationSeconds: null, transcript: null },
          { id: 'offer-vl-examples', title: 'Examples of Value Ladder', videoId: null, durationSeconds: null, transcript: null },
        ],
      },
      {
        id: 'offer-guarantee',
        title: 'Guarantee',
        lessons: [
          { id: 'offer-guarantee-what-is', title: 'What is a guarantee?', videoId: null, durationSeconds: null, transcript: null },
        ],
      },
      {
        id: 'offer-incentivization',
        title: 'Incentivization',
        lessons: [
          { id: 'offer-incentive-cut-types', title: 'What is a cut and different types of incentive', videoId: null, durationSeconds: null, transcript: null },
        ],
      },
    ],
  },

  // ================================================================
  // 4. UNEDITED RECORDINGS
  // Only explicitly listed recordings. Add more here as they occur.
  // ================================================================
  {
    id: 'unedited-recordings',
    title: 'Unedited Recordings',
    slug: 'unedited-recordings',
    type: 'recordings',
    sortOrder: 4,
    modules: [
      {
        id: 'recordings-sales-zero-cuts',
        title: 'Sales Zero Cuts',
        lessons: [
          { id: 'rec-sales-13-apr-2026', title: 'Sales w/ Saad - 13th April 2026', videoId: null, durationSeconds: null, transcript: null },
          { id: 'rec-sales-20-apr-2026', title: 'Sales w/ Saad - 20th April 2026', videoId: null, durationSeconds: null, transcript: null },
          { id: 'rec-sales-27-apr-2026', title: 'Sales w/ Saad - 27th April 2026', videoId: null, durationSeconds: null, transcript: null },
          { id: 'rec-sales-18-aug-2026', title: 'Sales w/ Saad - 18th August 2026', videoId: null, durationSeconds: null, transcript: null },
        ],
      },
      {
        id: 'recordings-offer-zero-cuts',
        title: 'Offer Zero Cuts',
        lessons: [
          { id: 'rec-offer-7-apr-2026', title: 'Offer w/ Emad - 7th April 2026', videoId: null, durationSeconds: null, transcript: null },
          { id: 'rec-offer-14-apr-2026', title: 'Offer w/ Emad - 14th April 2026', videoId: null, durationSeconds: null, transcript: null },
          { id: 'rec-offer-17-aug-2026', title: 'Offer w/ Emad - 17th August 2026', videoId: null, durationSeconds: null, transcript: null },
        ],
      },
      {
        id: 'recordings-content-zero-cuts',
        title: 'Content Zero Cuts',
        lessons: [
          { id: 'rec-content-8-apr-2026', title: 'Content w/ Shafaq - 8th April 2026', videoId: null, durationSeconds: null, transcript: null },
          { id: 'rec-content-15-apr-2026', title: 'Content w/ Shafaq - 15th April 2026', videoId: null, durationSeconds: null, transcript: null },
          { id: 'rec-content-19-aug-2026', title: 'Content w/ Shafaq - 19th August 2026', videoId: null, durationSeconds: null, transcript: null },
        ],
      },
      {
        id: 'recordings-guest-lectures',
        title: 'Guest Lectures',
        lessons: [
          { id: 'rec-guest-ai-ads-yash-28-may', title: 'AI Ad Creation w/ Yash - 28th May 2026', videoId: null, durationSeconds: null, transcript: null },
          { id: 'rec-guest-meta-ads-rahul-8-jun', title: 'Meta Ads w/ Rahul - 08th June 2026', videoId: null, durationSeconds: null, transcript: null },
          { id: 'rec-guest-mohit-goyal', title: 'Guest Lecture - Mohit Goyal', videoId: null, durationSeconds: null, transcript: null },
          { id: 'rec-guest-meta-ads-rahul-5-jul', title: 'Meta Ads w/ Rahul - 05 July 2026', videoId: null, durationSeconds: null, transcript: null },
          { id: 'rec-guest-sales-roleplay-ojas', title: 'Sales Roleplay w/ Ojas - 21st June 2026', videoId: null, durationSeconds: null, transcript: null },
        ],
      },
    ],
  },

  // ================================================================
  // 5. COLD CALLING
  // ================================================================
  {
    id: 'cold-calling',
    title: 'Cold Calling',
    slug: 'cold-calling',
    type: 'structured',
    sortOrder: 5,
    modules: [
      {
        id: 'cc-module-1',
        title: 'Module 1 — Foundations of Cold Calling',
        lessons: [
          { id: 'cc-m1-what-is', title: 'What is Cold Calling', videoId: null, durationSeconds: null, transcript: null },
          { id: 'cc-m1-mindset', title: 'Mindset for Success', videoId: null, durationSeconds: null, transcript: null },
          { id: 'cc-m1-extra-1-manifestation', title: 'Extra 1 - Law of Manifestation', videoId: null, durationSeconds: null, transcript: null },
          { id: 'cc-m1-extra-2-rejection', title: 'Extra 2 - Fear of Rejection', videoId: null, durationSeconds: null, transcript: null },
        ],
      },
      {
        id: 'cc-module-2',
        title: 'Module 2 — Prospect Identification & Targeting',
        lessons: [
          { id: 'cc-m2-icp', title: 'Defining Your Ideal Customer Profile (ICP)', videoId: null, durationSeconds: null, transcript: null },
          { id: 'cc-m2-extra-1-tracking', title: "Extra 1 - The 'Tracking' Video", videoId: null, durationSeconds: null, transcript: null },
          { id: 'cc-m2-extra-2-targeting', title: "Extra 2 - The 'Targeting' Video", videoId: null, durationSeconds: null, transcript: null },
          { id: 'cc-m2-extra-3-sam', title: 'Extra 3 - The "SAM" Models', videoId: null, durationSeconds: null, transcript: null },
        ],
      },
      {
        id: 'cc-module-3',
        title: 'Module 3 — Pre-Call Preparation',
        lessons: [
          { id: 'cc-m3-checklist', title: 'Pre-Call Checklist', videoId: null, durationSeconds: null, transcript: null },
          { id: 'cc-m3-extra-1-bigin-crm', title: 'Extra 1 - Bigin CRM setup guide', videoId: null, durationSeconds: null, transcript: null },
        ],
      },
      {
        id: 'cc-module-4',
        title: 'Module 4 — The Four-Part Framework',
        lessons: [
          { id: 'cc-m4-part-1-open', title: 'Part 1 : Open', videoId: null, durationSeconds: null, transcript: null },
          { id: 'cc-m4-part-2-pitch', title: 'Part 2 : Pitch (Body)', videoId: null, durationSeconds: null, transcript: null },
          { id: 'cc-m4-part-3-tonality', title: 'Part 3: Tonality + Objection Handling', videoId: null, durationSeconds: null, transcript: null },
          { id: 'cc-m4-extra-1-voice', title: 'Extra 1 - Foundations of Voice & Speech', videoId: null, durationSeconds: null, transcript: null },
          { id: 'cc-m4-extra-2-modulation', title: 'Extra 2 - Modulation: Utilizing Foundation of Speech', videoId: null, durationSeconds: null, transcript: null },
          { id: 'cc-m4-extra-3-pitching', title: 'Extra 3 - Pitching', videoId: null, durationSeconds: null, transcript: null },
          { id: 'cc-m4-extra-4-bant', title: 'Extra 4 - BANT Methodology', videoId: null, durationSeconds: null, transcript: null },
          { id: 'cc-m4-extra-5-assumed-close', title: 'Extra 5 - The Assumed Close', videoId: null, durationSeconds: null, transcript: null },
        ],
      },
    ],
  },
];

// ============================================================
// HELPERS — used by UI components
// ============================================================

/** Flatten all lessons from all blocks into one array */
export function getAllLessonIds(): string[] {
  return CLASSROOM_DATA.flatMap(block =>
    block.modules.flatMap(mod => mod.lessons.map(l => l.id))
  );
}

/** Find a lesson by ID anywhere in the curriculum */
export function findLesson(lessonId: string): ClassroomLesson | null {
  for (const block of CLASSROOM_DATA) {
    for (const mod of block.modules) {
      const lesson = mod.lessons.find(l => l.id === lessonId);
      if (lesson) return lesson;
    }
  }
  return null;
}

/** Find the next lesson after the given lesson ID (for "Next Lesson" button) */
export function findNextLesson(lessonId: string): ClassroomLesson | null {
  const allLessons: ClassroomLesson[] = CLASSROOM_DATA.flatMap(b =>
    b.modules.flatMap(m => m.lessons)
  );
  const idx = allLessons.findIndex(l => l.id === lessonId);
  return idx >= 0 && idx < allLessons.length - 1 ? allLessons[idx + 1] : null;
}

/** Calculate progress for a block (0–100) based on progress map */
export function calcBlockProgress(block: ClassroomBlock, progressMap: Map<string, number>): number {
  const allLessons = block.modules.flatMap(m => m.lessons);
  if (allLessons.length === 0) return 0;
  const completed = allLessons.filter(l => (progressMap.get(l.id) ?? 0) >= 100).length;
  return Math.round((completed / allLessons.length) * 100);
}

/** Calculate progress for a module (0–100) based on progress map */
export function calcModuleProgress(mod: ClassroomModule, progressMap: Map<string, number>): number {
  if (mod.lessons.length === 0) return 0;
  const completed = mod.lessons.filter(l => (progressMap.get(l.id) ?? 0) >= 100).length;
  return Math.round((completed / mod.lessons.length) * 100);
}
