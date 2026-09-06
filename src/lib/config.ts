/** Client-safe application configuration. No secrets here. */

export const APP_NAME = "RankUp AI";

/** Configurable AI usage limits per plan tier (requests per day). */
export const AI_DAILY_LIMITS: Record<string, number> = {
  free: 25,
  premium: 250,
  admin: 1000,
};

/** Feature flags — premium capabilities can be toggled without code changes. */
export const FEATURE_FLAGS = {
  aiCoach: true,
  aiDoubtSolver: true,
  aiNotes: true,
  aiQuestionGenerator: true,
  aiStudyPlan: false,
  aiPerformanceAnalysis: true,
  premiumAnalytics: false,
  notifications: false,
  payments: false,
} as const;

/** Premium-only capabilities. Used together with profile.plan_tier. */
export const PREMIUM_FEATURES = ["premiumAnalytics"] as const;

/** Fallback scoring used only when an exam row has no rules of its own. */
export const DEFAULT_SCORING = { correct: 2, wrong: -0.5, skipped: 0 };

export const DIFFICULTIES = ["easy", "medium", "hard"] as const;
export const STUDY_LEVELS = ["beginner", "intermediate", "advanced"] as const;
export const PRACTICE_SIZES = [5, 10, 20, 30] as const;

export function dailyLimitFor(tier: string | null | undefined) {
  return AI_DAILY_LIMITS[tier ?? "free"] ?? AI_DAILY_LIMITS["free"]!;
}
