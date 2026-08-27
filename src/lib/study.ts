import { supabase } from "@/integrations/supabase/client";

/** Records study minutes and keeps the daily goal + streak up to date. */
export async function recordActivity(opts: {
  userId: string;
  activity: string;
  minutes: number;
  questions?: number;
}) {
  const today = new Date().toISOString().slice(0, 10);

  await supabase.from("study_sessions").insert({
    user_id: opts.userId,
    activity: opts.activity,
    minutes: Math.max(0, Math.round(opts.minutes)),
    occurred_on: today,
  });

  const { data: profile } = await supabase
    .from("profiles")
    .select("daily_question_goal, daily_minutes_goal, current_streak, longest_streak, last_active_date")
    .eq("id", opts.userId)
    .maybeSingle();

  const { data: goal } = await supabase
    .from("daily_goals")
    .select("*")
    .eq("user_id", opts.userId)
    .eq("goal_date", today)
    .maybeSingle();

  if (goal) {
    await supabase
      .from("daily_goals")
      .update({
        questions_done: (goal.questions_done ?? 0) + (opts.questions ?? 0),
        minutes_done: (goal.minutes_done ?? 0) + Math.max(0, Math.round(opts.minutes)),
      })
      .eq("id", goal.id);
  } else {
    await supabase.from("daily_goals").insert({
      user_id: opts.userId,
      goal_date: today,
      question_goal: profile?.daily_question_goal ?? 30,
      minutes_goal: profile?.daily_minutes_goal ?? 90,
      questions_done: opts.questions ?? 0,
      minutes_done: Math.max(0, Math.round(opts.minutes)),
    });
  }

  // streak
  const last = profile?.last_active_date ?? null;
  if (last !== today) {
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const streak = last === yesterday ? (profile?.current_streak ?? 0) + 1 : 1;
    await supabase
      .from("profiles")
      .update({
        current_streak: streak,
        longest_streak: Math.max(streak, profile?.longest_streak ?? 0),
        last_active_date: today,
      })
      .eq("id", opts.userId);
  }
}

/** Adds or refreshes a spaced-repetition revision item for a question. */
export async function scheduleRevision(userId: string, questionId: string, wasCorrect: boolean) {
  const { data: existing } = await supabase
    .from("revision_items")
    .select("*")
    .eq("user_id", userId)
    .eq("question_id", questionId)
    .maybeSingle();

  const baseInterval = wasCorrect ? Math.max(2, (existing?.interval_days ?? 1) * 2) : 1;
  const next = new Date(Date.now() + baseInterval * 86400000).toISOString().slice(0, 10);

  if (existing) {
    await supabase
      .from("revision_items")
      .update({
        review_count: (existing.review_count ?? 0) + 1,
        interval_days: baseInterval,
        last_reviewed_at: new Date().toISOString(),
        next_review_date: next,
        difficulty: wasCorrect ? "easy" : "hard",
      })
      .eq("id", existing.id);
    return;
  }

  await supabase.from("revision_items").insert({
    user_id: userId,
    question_id: questionId,
    item_type: "question",
    difficulty: wasCorrect ? "easy" : "hard",
    interval_days: baseInterval,
    next_review_date: next,
    last_reviewed_at: new Date().toISOString(),
    review_count: 1,
  });
}

export function formatClock(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m % 60)}:${pad(s % 60)}` : `${pad(m)}:${pad(s % 60)}`;
}
