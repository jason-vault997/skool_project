export interface Course {
  id: string;
  category: 'SALES' | 'CONTENT' | 'OFFER';
  title: string;
  subtitle: string;
  thumbnail: string;
  progress: number;
  totalLessons: number;
  completedLessons: number;
  locked?: boolean;
}

export interface SessionInfo {
  id: string;
  title: string;
  speaker: string;
  time: string;
  timeDisplay: string;
  countdown: string;
  description: string;
  category: 'SALES' | 'CONTENT' | 'OFFER';
}

export interface CheckInItem {
  studiedYesterday: string;
  question: string;
  applied: boolean | null;
}

export interface BusinessLogEntry {
  day: string;
  date?: string;
  hours: number;
  status: string;
  notes?: string;
  isWorked: boolean;
}

export interface CalendarSession {
  day: number;
  dateStr: string;
  title: string;
  time: string;
  speaker: string;
  type: 'Offer' | 'Sales' | 'Content' | 'Deep Dive';
  isPast?: boolean;
  isToday?: boolean;
}

export interface LevelInfo {
  level: number;
  title: string;
  xpRequired: number;
  status: 'completed' | 'current' | 'locked';
  perks: string;
}

export const sampleUserData = {
  name: "Jason",
  fullName: "Jason Harris",
  avatar: "/assets/jason-avatar.png",
  dayCount: 17,
  priority: "SALES",
  operatingPrinciples: {
    primary: "WHO'S GOT MY MONEY?",
    secondary: "WRITE IT DOWN. EXECUTE IT."
  },
  goalStatement: "You are not here to finish courses. You are here to build 100 clients."
};

export const sampleSessionData: SessionInfo = {
  id: "session-today",
  title: "Sales with Saad",
  speaker: "Saad Mohamed",
  time: "20:00",
  timeDisplay: "8:00 PM",
  countdown: "2h 13m",
  description: "Live breakdown of handling tough budget resistance & price anchor negotiations.",
  category: "SALES"
};

export const sampleCheckInData: CheckInItem = {
  studiedYesterday: "Handling Objections",
  question: "Did you actually apply it?",
  applied: null
};

export const sampleProgressData = {
  categories: [
    { name: "SALES", progress: 74, color: "#10b981", active: true },
    { name: "CONTENT", progress: 21, color: "#c5ef26", active: false },
    { name: "OFFER", progress: 8, color: "#3b82f6", active: false }
  ],
  executionVsLearning: {
    learning: 74,
    application: 31,
    business: {
      current: 6,
      target: 100,
      percentage: 6
    }
  },
  todayBusiness: {
    leadsToday: 3,
    salesCalls: 2,
    closedToday: 0,
    contentPosted: {
      current: 4,
      target: 8
    },
    workedHours: 6.5
  }
};

export const sampleCockyMessage = {
  headline: "You've learned more than you've used.",
  stats: [
    { label: "Sales Complete", value: "74%" },
    { label: "Actually Applied", value: "31%" }
  ],
  callout: "Stop collecting information and start making the market prove you learned it."
};

export const sampleCourses: Course[] = [
  // SALES
  {
    id: "course-cold-calling",
    category: "SALES",
    title: "Cold Calling Module",
    subtitle: "Live unedited calls, tone calibration & rapid hook drills",
    thumbnail: "/assets/cold-calling-full.png",
    progress: 39,
    totalLessons: 18,
    completedLessons: 7
  },
  {
    id: "course-sales-calls",
    category: "SALES",
    title: "Sales Calls",
    subtitle: "Discovery, diagnostic framing & running 45-min close calls",
    thumbnail: "/assets/course-sales.png",
    progress: 15,
    totalLessons: 20,
    completedLessons: 3
  },
  {
    id: "course-objection-handling",
    category: "SALES",
    title: "Objection Handling",
    subtitle: "Real-time responses to 'Too expensive', 'Send info', 'Think about it'",
    thumbnail: "/assets/course-sales.png",
    progress: 85,
    totalLessons: 12,
    completedLessons: 10
  },
  {
    id: "course-sales-frameworks",
    category: "SALES",
    title: "Sales Frameworks",
    subtitle: "End-to-end closing blueprints & qualification matrices",
    thumbnail: "/assets/course-sales.png",
    progress: 0,
    totalLessons: 14,
    completedLessons: 0
  },
  // CONTENT
  {
    id: "course-content-engine",
    category: "CONTENT",
    title: "Content Engine",
    subtitle: "High-volume short form & repurposing systems for inbound lead flow",
    thumbnail: "/assets/course-content.png",
    progress: 21,
    totalLessons: 16,
    completedLessons: 3
  },
  {
    id: "course-personal-brand",
    category: "CONTENT",
    title: "Personal Brand",
    subtitle: "Founder credibility, positioning & distribution leverage",
    thumbnail: "/assets/course-content.png",
    progress: 0,
    totalLessons: 10,
    completedLessons: 0
  },
  // OFFER
  {
    id: "course-offer-fundamentals",
    category: "OFFER",
    title: "Offer Fundamentals",
    subtitle: "Irresistible grand slam offer architecture & pricing psychology",
    thumbnail: "/assets/course-offer.png",
    progress: 8,
    totalLessons: 15,
    completedLessons: 1
  },
  {
    id: "course-business-acquisition",
    category: "OFFER",
    title: "Business Acquisition",
    subtitle: "B2B client pipelines, outbound scripts & retention infrastructure",
    thumbnail: "/assets/course-offer.png",
    progress: 0,
    totalLessons: 12,
    completedLessons: 0
  }
];

export const sampleBusinessData = {
  title: "BUILD 100",
  subtitle: "The classroom teaches you. The business proves whether you learned.",
  clientGoal: {
    current: 6,
    target: 100,
    percentage: 6
  },
  nextMilestone: {
    target: 10,
    current: 6,
    label: "10 CLIENTS",
    progress: 60
  },
  metrics: {
    leads: 17,
    salesCalls: 11,
    clients: 6,
    revenue: "₹1,80,000",
    conversion: "54.5%"
  },
  acquisition: {
    platform: "INSTAGRAM",
    repostAccounts: "6 / 6",
    originalContentStatus: "Posted",
    personalBrandStatus: "Posted"
  },
  backup: {
    jobApplicationsToday: 2,
    note: "Backup pipeline safety tracking only"
  },
  buildLog: {
    entries: [
      { day: "Monday", date: "Aug 25", hours: 8, status: "Worked 8h", notes: "12 Cold calls & 2 strategy sessions", isWorked: true },
      { day: "Tuesday", date: "Aug 26", hours: 3, status: "Worked 3h", notes: "Followed up with 4 warm pipeline prospects", isWorked: true },
      { day: "Wednesday", date: "Aug 27", hours: 7, status: "Worked 7h", notes: "Drafted 8 hooks & produced 4 video assets", isWorked: true },
      { day: "Thursday", date: "Aug 28", hours: 0, status: "Did not work", notes: "Pipeline audit and deep systems rest", isWorked: false },
      { day: "Friday", date: "Aug 29", hours: 6, status: "Worked 6h", notes: "2 closing calls & objection audit", isWorked: true },
      { day: "Saturday", date: "Aug 30", hours: 10, status: "Worked 10h", notes: "Full outbound outreach blitz & DM follow-ups", isWorked: true },
      { day: "Sunday", date: "Aug 31", hours: 9, status: "Worked 9h", notes: "Contract sent & closed 6th client!", isWorked: true }
    ],
    summary: {
      hoursThisMonth: 143,
      workingDays: 28,
      longestDay: 11,
      weekendDaysWorked: 4
    }
  }
};

export const sampleLeaderboardData = {
  title: "LEADERBOARD",
  subtitle: "JASON VS JASON",
  tagline: "Compete exclusively against your previous standard.",
  operator: {
    name: "Jason Harris",
    avatar: "/assets/jason-avatar.png",
    level: 7,
    title: "Operator",
    nextLevel: 8,
    nextTitle: "Centurion (100 Clients)",
    pointsToLevelUp: 1700,
    progressPercentage: 71
  },
  xpBreakdown: {
    execution: 2480,
    application: 1140,
    business: 680,
    total: 4300
  },
  levels: [
    { level: 1, title: "Novice", xpRequired: 0, status: "completed", perks: "Initial onboarding & curriculum unlock" },
    { level: 2, title: "Apprentice", xpRequired: 300, status: "completed", perks: "First 10 cold calls completed" },
    { level: 3, title: "Practitioner", xpRequired: 750, status: "completed", perks: "First live sales call completed" },
    { level: 4, title: "Builder", xpRequired: 1400, status: "completed", perks: "First paying client closed (₹30k+)" },
    { level: 5, title: "Closer", xpRequired: 2200, status: "completed", perks: "3 clients closed & recurring engine" },
    { level: 6, title: "Rainmaker", xpRequired: 3100, status: "completed", perks: "5 clients closed & ₹1.5L+ milestone" },
    { level: 7, title: "Operator", xpRequired: 4200, status: "current", perks: "Active tier: Consistent daily execution" },
    { level: 8, title: "Centurion", xpRequired: 6000, status: "locked", perks: "Scale milestone: 25+ verified clients" },
    { level: 9, title: "Titan (100 Clients)", xpRequired: 10000, status: "locked", perks: "Mastery milestone: 100 clients closed" }
  ] as LevelInfo[],
  personalRecords: [
    { metric: "Longest Work Sprint", record: "11.5 hours", achieved: "Aug 16, 2026" },
    { metric: "Most Calls in a Day", record: "6 calls", achieved: "Aug 22, 2026" },
    { metric: "Fastest Close", record: "1 Call Close (₹45,000)", achieved: "Aug 24, 2026" },
    { metric: "Weekly Consistency Streak", record: "17 Days Active", achieved: "Current Streak" }
  ]
};

export const sampleAboutData = {
  title: "BUILD100",
  tagline: "Build your first 100 clients.",
  heroImage: "/assets/about-hero.png",
  saadBanner: "/assets/saad-banner.png",
  badge: "Private Operating System",
  meta: {
    status: "Private Operating System",
    sessionsCount: "6 live sessions / week",
    mentorCount: "3 Specialized Mentors",
    activeUser: "Jason Harris"
  },
  pillars: [
    {
      category: "SALES",
      headline: "Learn how to sell.",
      description: "Fix where the conversation breaks before they buy. Tone, framing, live objection dismantling, and diagnostic closing.",
      coach: "Saad Mohamed"
    },
    {
      category: "CONTENT",
      headline: "Learn how to attract attention.",
      description: "Fix what you put out so the right prospects find you. High-converting short-form frameworks and outbound direct response.",
      coach: "Shafaq"
    },
    {
      category: "OFFER",
      headline: "Learn how to make the right people want the thing.",
      description: "Fix what you are selling so people say yes naturally. Value stacking, outcome guarantee design, and pricing power.",
      coach: "Emad"
    }
  ],
  objective: {
    title: "THE REAL OBJECTIVE",
    body: "The objective is not to finish the classroom.\nThe objective is to become the kind of operator who can build a real business."
  },
  weeklySchedule: [
    { day: "Monday", time: "8:00 PM", track: "Offer Training Session", coach: "Emad" },
    { day: "Tuesday", time: "8:00 PM", track: "Sales Training Session", coach: "Saad" },
    { day: "Wednesday", time: "8:00 PM", track: "Marketing & Content", coach: "Shafaq" },
    { day: "Thursday", time: "7:00 PM", track: "Offer Deep Dive Drill", coach: "Emad" },
    { day: "Friday", time: "8:00 PM", track: "Sales Live Call Reviews", coach: "Saad" },
    { day: "Saturday", time: "9:00 PM", track: "Content Architecture", coach: "Shafaq" }
  ]
};

export const sampleCalendarMonth = {
  year: 2026,
  monthName: "August",
  timeZoneDisplay: "5:59pm Calcutta time",
  currentDay: 31,
  days: [
    // Previous month padding days (July 27-31)
    { dayNumber: 27, isCurrentMonth: false, events: [{ id: "c1", title: "7pm - Offer w/ Emad", type: "Offer", time: "7:00 PM" }] },
    { dayNumber: 28, isCurrentMonth: false, events: [{ id: "c2", title: "9pm - Sales w/ Saad", type: "Sales", time: "9:00 PM" }] },
    { dayNumber: 29, isCurrentMonth: false, events: [{ id: "c3", title: "9pm - Content w/ Shafaq", type: "Content", time: "9:00 PM" }] },
    { dayNumber: 30, isCurrentMonth: false, events: [{ id: "c4", title: "7pm - Deep Dive w/ Emad", type: "Deep Dive", time: "7:00 PM" }] },
    { dayNumber: 31, isCurrentMonth: false, events: [{ id: "c5", title: "8pm - Deep Dive w/ Saad", type: "Deep Dive", time: "8:00 PM" }] },
    { dayNumber: 1, isCurrentMonth: true, events: [{ id: "c6", title: "9pm - Deep Dive w/ Shafaq", type: "Deep Dive", time: "9:00 PM" }] },
    { dayNumber: 2, isCurrentMonth: true, events: [] },

    // Week 1 (Aug 3 - Aug 9)
    { dayNumber: 3, isCurrentMonth: true, events: [{ id: "c7", title: "7pm - Offer w/ Emad", type: "Offer", time: "7:00 PM" }] },
    { dayNumber: 4, isCurrentMonth: true, events: [{ id: "c8", title: "9pm - Sales w/ Saad", type: "Sales", time: "9:00 PM" }] },
    { dayNumber: 5, isCurrentMonth: true, events: [{ id: "c9", title: "9pm - Content w/ Shafaq", type: "Content", time: "9:00 PM" }] },
    { dayNumber: 6, isCurrentMonth: true, events: [{ id: "c10", title: "9pm - Deep Dive w/ Team", type: "Deep Dive", time: "9:00 PM" }] },
    { dayNumber: 7, isCurrentMonth: true, events: [{ id: "c11", title: "8pm - Deep Dive w/ Saad", type: "Deep Dive", time: "8:00 PM" }] },
    { dayNumber: 8, isCurrentMonth: true, events: [{ id: "c12", title: "8pm - Deep Dive w/ Shafaq", type: "Deep Dive", time: "8:00 PM" }] },
    { dayNumber: 9, isCurrentMonth: true, events: [] },

    // Week 2 (Aug 10 - Aug 16)
    { dayNumber: 10, isCurrentMonth: true, events: [{ id: "c13", title: "7pm - Offer w/ Emad", type: "Offer", time: "7:00 PM" }] },
    { dayNumber: 11, isCurrentMonth: true, events: [{ id: "c14", title: "9:30pm - Sales w/ Saad", type: "Sales", time: "9:30 PM" }] },
    { dayNumber: 12, isCurrentMonth: true, events: [{ id: "c15", title: "9pm - Content w/ Shafaq", type: "Content", time: "9:00 PM" }] },
    { dayNumber: 13, isCurrentMonth: true, events: [{ id: "c16", title: "7pm - Deep Dive w/ Emad", type: "Deep Dive", time: "7:00 PM" }] },
    { dayNumber: 14, isCurrentMonth: true, events: [{ id: "c17", title: "8pm - Deep Dive w/ Saad", type: "Deep Dive", time: "8:00 PM" }] },
    { dayNumber: 15, isCurrentMonth: true, events: [{ id: "c18", title: "9pm - Deep Dive w/ Shafaq", type: "Deep Dive", time: "9:00 PM" }] },
    { dayNumber: 16, isCurrentMonth: true, events: [] },

    // Week 3 (Aug 17 - Aug 23)
    { dayNumber: 17, isCurrentMonth: true, events: [{ id: "c19", title: "9pm - Offer w/ Emad", type: "Offer", time: "9:00 PM" }] },
    { dayNumber: 18, isCurrentMonth: true, events: [{ id: "c20", title: "9pm - Sales w/ Saad", type: "Sales", time: "9:00 PM" }] },
    { dayNumber: 19, isCurrentMonth: true, events: [{ id: "c21", title: "9pm - Content w/ Shafaq", type: "Content", time: "9:00 PM" }] },
    { dayNumber: 20, isCurrentMonth: true, events: [{ id: "c22", title: "7pm - Deep Dive w/ Emad", type: "Deep Dive", time: "7:00 PM" }] },
    { dayNumber: 21, isCurrentMonth: true, events: [{ id: "c23", title: "8pm - Deep Dive w/ Saad", type: "Deep Dive", time: "8:00 PM" }] },
    { dayNumber: 22, isCurrentMonth: true, events: [{ id: "c24", title: "9pm - Deep Dive w/ Shafaq", type: "Deep Dive", time: "9:00 PM" }] },
    { dayNumber: 23, isCurrentMonth: true, events: [] },

    // Week 4 (Aug 24 - Aug 30)
    { dayNumber: 24, isCurrentMonth: true, events: [] },
    { dayNumber: 25, isCurrentMonth: true, events: [{ id: "c25", title: "9pm - Sales w/ Saad", type: "Sales", time: "9:00 PM" }] },
    { dayNumber: 26, isCurrentMonth: true, events: [{ id: "c26", title: "9pm - Content w/ Shafaq", type: "Content", time: "9:00 PM" }] },
    { dayNumber: 27, isCurrentMonth: true, events: [{ id: "c27", title: "7pm - Deep Dive w/ Emad", type: "Deep Dive", time: "7:00 PM" }] },
    { dayNumber: 28, isCurrentMonth: true, events: [{ id: "c28", title: "8:30pm - Deep Dive w/ Saad", type: "Deep Dive", time: "8:30 PM" }] },
    { dayNumber: 29, isCurrentMonth: true, events: [{ id: "c29", title: "9pm - Deep Dive w/ Shafaq", type: "Deep Dive", time: "9:00 PM" }] },
    { dayNumber: 30, isCurrentMonth: true, events: [] },

    // Week 5 (Aug 31 & Next Month padding)
    { dayNumber: 31, isCurrentMonth: true, isToday: true, events: [{ id: "c30", title: "8pm - Sales w/ Saad", type: "Sales", time: "8:00 PM" }] },
    { dayNumber: 1, isCurrentMonth: false, events: [{ id: "c31", title: "9pm - Sales w/ Saad", type: "Sales", time: "9:00 PM" }] },
    { dayNumber: 2, isCurrentMonth: false, events: [{ id: "c32", title: "9pm - Content w/ Shafaq", type: "Content", time: "9:00 PM" }] },
    { dayNumber: 3, isCurrentMonth: false, events: [{ id: "c33", title: "7pm - Deep Dive w/ Emad", type: "Deep Dive", time: "7:00 PM" }] },
    { dayNumber: 4, isCurrentMonth: false, events: [{ id: "c34", title: "8pm - Deep Dive w/ Saad", type: "Deep Dive", time: "8:00 PM" }] },
    { dayNumber: 5, isCurrentMonth: false, events: [{ id: "c35", title: "9pm - Deep Dive w/ Shafaq", type: "Deep Dive", time: "9:00 PM" }] },
    { dayNumber: 6, isCurrentMonth: false, events: [] }
  ]
};
