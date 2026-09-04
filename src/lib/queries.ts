import { queryOptions, type QueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Session read from local storage (no network round-trip), unlike auth.getUser().
 * Used by every query so navigation never blocks on an auth API call.
 */
export async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user?.id ?? null;
}

export const QUESTION_SELECT = "id, question_text, options, difficulty, topics(name), subjects(name)";

export const profileQuery = queryOptions({
  queryKey: ["profile"],
  staleTime: 5 * 60_000,
  queryFn: async () => {
    const userId = await currentUserId();
    if (!userId) return null;
    const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
    if (error) throw error;
    return data;
  },
});

export const isAdminQuery = queryOptions({
  queryKey: ["is-admin"],
  staleTime: 10 * 60_000,
  queryFn: async () => {
    const userId = await currentUserId();
    if (!userId) return false;
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    return Boolean(data);
  },
});

export const dashboardStatsQuery = queryOptions({
  queryKey: ["dashboard-stats"],
  queryFn: async () => {
    const userId = await currentUserId();
    if (!userId) throw new Error("Not signed in");
    const today = new Date().toISOString().slice(0, 10);

    const [goal, answers, attempts, minutes] = await Promise.all([
      supabase.from("daily_goals").select("*").eq("user_id", userId).eq("goal_date", today).maybeSingle(),
      supabase.from("practice_answers").select("is_correct").eq("user_id", userId),
      supabase
        .from("test_attempts")
        .select("score, max_marks, accuracy, status")
        .eq("user_id", userId)
        .eq("status", "submitted"),
      supabase.from("study_sessions").select("minutes").eq("user_id", userId),
    ]);

    const rows = answers.data ?? [];
    const submitted = attempts.data ?? [];
    const avgScore = submitted.length
      ? Math.round(
          submitted.reduce(
            (s, a) => s + (Number(a.max_marks) > 0 ? (Number(a.score) / Number(a.max_marks)) * 100 : 0),
            0,
          ) / submitted.length,
        )
      : 0;

    return {
      goal: goal.data,
      questionsAttempted: rows.length,
      accuracy: rows.length ? Math.round((rows.filter((r) => r.is_correct).length / rows.length) * 100) : 0,
      testsCompleted: submitted.length,
      averageScore: avgScore,
      totalMinutes: (minutes.data ?? []).reduce((s, m) => s + (m.minutes ?? 0), 0),
    };
  },
});

export const testsQuery = queryOptions({
  queryKey: ["tests"],
  staleTime: 10 * 60_000,
  queryFn: async () => {
    const { data, error } = await supabase
      .from("tests")
      .select("id, title, description, test_type, duration_minutes, total_questions")
      .eq("is_published", true)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },
});

export const testAttemptsQuery = queryOptions({
  queryKey: ["test-attempts"],
  queryFn: async () => {
    const userId = await currentUserId();
    if (!userId) return [];
    const { data, error } = await supabase
      .from("test_attempts")
      .select("id, test_id, status, score, max_marks, accuracy, submitted_at, tests(title)")
      .eq("user_id", userId)
      .order("started_at", { ascending: false })
      .limit(20);
    if (error) throw error;
    return data;
  },
});

export const revisionDueQuery = queryOptions({
  queryKey: ["revision-due"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("revision_items")
      .select(`id, user_id, question_id, next_review_date, questions(${QUESTION_SELECT})`)
      .lte("next_review_date", new Date().toISOString().slice(0, 10))
      .order("next_review_date")
      .limit(30);
    if (error) throw error;
    return data;
  },
});

export const bookmarksQuery = queryOptions({
  queryKey: ["bookmarks"],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("bookmarks")
      .select(`id, questions(${QUESTION_SELECT})`)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) throw error;
    return data;
  },
});

export const progressQuery = queryOptions({
  queryKey: ["progress"],
  queryFn: async () => {
    const userId = await currentUserId();
    if (!userId) throw new Error("Not signed in");

    const [answers, goals, attempts] = await Promise.all([
      supabase
        .from("practice_answers")
        .select("is_correct, time_taken_seconds, questions(subjects(name), topics(name))")
        .eq("user_id", userId)
        .limit(1000),
      supabase
        .from("daily_goals")
        .select("goal_date, questions_done, minutes_done, question_goal")
        .eq("user_id", userId)
        .order("goal_date", { ascending: false })
        .limit(14),
      supabase
        .from("test_attempts")
        .select("accuracy, score, max_marks, submitted_at")
        .eq("user_id", userId)
        .eq("status", "submitted")
        .order("submitted_at", { ascending: false })
        .limit(10),
    ]);

    if (answers.error) throw answers.error;
    return {
      answers: answers.data ?? [],
      goals: goals.data ?? [],
      attempts: attempts.data ?? [],
    };
  },
});

export const subjectsQuery = queryOptions({
  queryKey: ["subjects"],
  staleTime: 30 * 60_000,
  queryFn: async () => {
    const { data, error } = await supabase
      .from("subjects")
      .select("id, name, slug")
      .order("display_order");
    if (error) throw error;
    return data;
  },
});

/** Warm the cache for the routes a user is most likely to open next. */
export function prefetchForPath(queryClient: QueryClient, path: string) {
  const map: Record<string, Array<Parameters<QueryClient["prefetchQuery"]>[0]>> = {
    "/dashboard": [dashboardStatsQuery, profileQuery],
    "/practice": [subjectsQuery],
    "/tests": [testsQuery, testAttemptsQuery],
    "/revision": [revisionDueQuery, bookmarksQuery],
    "/progress": [progressQuery],
    "/profile": [profileQuery],
  };
  for (const options of map[path] ?? []) {
    void queryClient.prefetchQuery(options);
  }
}
