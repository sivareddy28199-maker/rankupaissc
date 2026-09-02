import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface AnswerKey {
  question_id: string;
  correct_answer: string;
  explanation: string | null;
}

async function adminClient() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function fetchKeys(questionIds: string[]): Promise<AnswerKey[]> {
  if (questionIds.length === 0) return [];
  const admin = await adminClient();
  const { data } = await admin
    .from("questions")
    .select("id, correct_answer, explanation")
    .in("id", questionIds);
  return (data ?? []).map((q: any) => ({
    question_id: q.id as string,
    correct_answer: q.correct_answer as string,
    explanation: (q.explanation ?? null) as string | null,
  }));
}

/** Spaced repetition scheduling, server-side (the client can no longer grade). */
async function scheduleRevisionServer(
  supabase: any,
  userId: string,
  questionId: string,
  wasCorrect: boolean,
) {
  const { data: existing } = await supabase
    .from("revision_items")
    .select("*")
    .eq("user_id", userId)
    .eq("question_id", questionId)
    .maybeSingle();

  const interval = wasCorrect ? Math.max(2, (existing?.interval_days ?? 1) * 2) : 1;
  const next = new Date(Date.now() + interval * 86400000).toISOString().slice(0, 10);

  if (existing) {
    await supabase
      .from("revision_items")
      .update({
        review_count: (existing.review_count ?? 0) + 1,
        interval_days: interval,
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
    interval_days: interval,
    next_review_date: next,
    last_reviewed_at: new Date().toISOString(),
    review_count: 1,
  });
}

/** Grades one practice answer server-side and only then reveals the answer key. */
export const answerPracticeQuestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        sessionId: z.string().uuid(),
        questionId: z.string().uuid(),
        selectedAnswer: z.string().min(1).max(2000),
        timeTakenSeconds: z.number().int().min(0).max(86400).default(0),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: session } = await supabase
      .from("practice_sessions")
      .select("id")
      .eq("id", data.sessionId)
      .maybeSingle();
    if (!session) throw new Error("Practice session not found.");

    const [key] = await fetchKeys([data.questionId]);
    if (!key) throw new Error("Question not found.");

    const isCorrect = data.selectedAnswer === key.correct_answer;

    await supabase.from("practice_answers").insert({
      session_id: data.sessionId,
      user_id: userId,
      question_id: data.questionId,
      selected_answer: data.selectedAnswer,
      correct_answer: key.correct_answer,
      is_correct: isCorrect,
      time_taken_seconds: data.timeTakenSeconds,
    });

    if (!isCorrect) await scheduleRevisionServer(supabase, userId, data.questionId, false);

    return { isCorrect, correctAnswer: key.correct_answer, explanation: key.explanation };
  });

/** Grades a revision-queue answer, reschedules the item and reveals the key. */
export const answerRevisionQuestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        questionId: z.string().uuid(),
        selectedAnswer: z.string().min(1).max(2000),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: item } = await supabase
      .from("revision_items")
      .select("id")
      .eq("user_id", userId)
      .eq("question_id", data.questionId)
      .maybeSingle();
    if (!item) throw new Error("This question is not in your revision queue.");

    const [key] = await fetchKeys([data.questionId]);
    if (!key) throw new Error("Question not found.");

    const isCorrect = data.selectedAnswer === key.correct_answer;
    await scheduleRevisionServer(supabase, userId, data.questionId, isCorrect);

    return { isCorrect, correctAnswer: key.correct_answer, explanation: key.explanation };
  });

/** Returns answer keys only for questions the learner has already attempted. */
export const getAttemptedAnswerKeys = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ questionIds: z.array(z.string().uuid()).max(200) }).parse(data),
  )
  .handler(async ({ data, context }): Promise<AnswerKey[]> => {
    const { supabase } = context;
    if (data.questionIds.length === 0) return [];

    const [{ data: practice }, { data: tests }] = await Promise.all([
      supabase
        .from("practice_answers")
        .select("question_id")
        .in("question_id", data.questionIds),
      supabase
        .from("test_answers")
        .select("question_id, test_attempts!inner(status)")
        .in("question_id", data.questionIds)
        .eq("test_attempts.status", "submitted"),
    ]);

    const attempted = new Set<string>([
      ...((practice ?? []) as any[]).map((r) => r.question_id as string),
      ...((tests ?? []) as any[]).map((r) => r.question_id as string),
    ]);

    return fetchKeys([...attempted]);
  });

/** Answer keys for a submitted attempt that belongs to the caller. */
export const getAttemptAnswerKeys = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ attemptId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }): Promise<AnswerKey[]> => {
    const { supabase } = context;
    const { data: attempt } = await supabase
      .from("test_attempts")
      .select("id, status")
      .eq("id", data.attemptId)
      .maybeSingle();
    if (!attempt || attempt.status !== "submitted") return [];

    const { data: rows } = await supabase
      .from("test_answers")
      .select("question_id")
      .eq("attempt_id", data.attemptId);

    return fetchKeys(((rows ?? []) as any[]).map((r) => r.question_id as string));
  });

/** Grades and submits a whole mock-test attempt server-side. */
export const submitTestAttempt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        attemptId: z.string().uuid(),
        timeSpentSeconds: z.number().int().min(0).max(86400).default(0),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: attempt } = await supabase
      .from("test_attempts")
      .select("id, test_id, status, tests(id, exams(marks_correct, marks_wrong))")
      .eq("id", data.attemptId)
      .maybeSingle();
    if (!attempt) throw new Error("Attempt not found.");

    const rules = ((attempt as any).tests?.exams ?? {}) as {
      marks_correct?: number;
      marks_wrong?: number;
    };
    const correctMark = Number(rules.marks_correct ?? 2);
    const wrongMark = Number(rules.marks_wrong ?? -0.5);

    const { data: testQuestions } = await supabase
      .from("test_questions")
      .select("question_id")
      .eq("test_id", (attempt as any).test_id);
    const questionIds = ((testQuestions ?? []) as any[]).map((r) => r.question_id as string);

    const { data: saved } = await supabase
      .from("test_answers")
      .select("question_id, selected_answer")
      .eq("attempt_id", data.attemptId);
    const selectedByQuestion = new Map<string, string | null>(
      ((saved ?? []) as any[]).map((r) => [r.question_id as string, r.selected_answer as string | null]),
    );

    const keys = new Map((await fetchKeys(questionIds)).map((k) => [k.question_id, k.correct_answer]));

    let score = 0;
    let correct = 0;
    let wrong = 0;
    let skipped = 0;

    for (const questionId of questionIds) {
      const selected = selectedByQuestion.get(questionId) ?? null;
      if (!selected) {
        skipped += 1;
        continue;
      }
      const isCorrect = selected === keys.get(questionId);
      if (isCorrect) {
        correct += 1;
        score += correctMark;
      } else {
        wrong += 1;
        score += wrongMark;
        await scheduleRevisionServer(supabase, userId, questionId, false);
      }
      await supabase
        .from("test_answers")
        .update({ is_correct: isCorrect })
        .eq("attempt_id", data.attemptId)
        .eq("question_id", questionId);
    }

    const attempted = correct + wrong;
    await supabase
      .from("test_attempts")
      .update({
        status: "submitted",
        score: Math.round(score * 100) / 100,
        max_marks: questionIds.length * correctMark,
        correct_count: correct,
        wrong_count: wrong,
        skipped_count: skipped,
        accuracy: attempted ? Math.round((correct / attempted) * 1000) / 10 : 0,
        time_spent_seconds: data.timeSpentSeconds,
        submitted_at: new Date().toISOString(),
      })
      .eq("id", data.attemptId);

    return { correct, wrong, skipped, attempted };
  });
