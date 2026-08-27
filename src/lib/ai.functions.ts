import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

import { runCompletion, parseJsonResponse, activeProviders } from "./ai/provider";
import {
  ANALYSIS_SYSTEM,
  COACH_SYSTEM,
  NOTES_SYSTEM,
  PLAN_SYSTEM,
  QUESTION_SYSTEM,
  TUTOR_SYSTEM,
  learnerBrief,
} from "./ai/prompts";
import { AiLimitError, AiUnavailableError } from "./ai/types";
import { assertWithinAiBudget, buildLearnerContext, logGeneration } from "./ai.server";

function toClientError(error: unknown): Error {
  if (error instanceof AiLimitError || error instanceof AiUnavailableError) {
    return new Error(error.message);
  }
  console.error("[ai] unexpected failure", error);
  return new Error("Something went wrong while contacting the AI. Please try again.");
}

async function guarded<T>(
  supabase: any,
  userId: string,
  capability: string,
  work: () => Promise<{ result: T; provider: string; model: string; tokensUsed: number }>,
): Promise<T> {
  try {
    await assertWithinAiBudget(supabase, userId);
    const { result, provider, model, tokensUsed } = await work();
    await logGeneration(supabase, userId, { capability, provider, model, tokensUsed, success: true });
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    if (!(error instanceof AiLimitError)) {
      await logGeneration(supabase, userId, {
        capability,
        provider: "chain",
        success: false,
        errorMessage: message,
      }).catch(() => undefined);
    }
    throw toClientError(error);
  }
}

/** Current AI usage + provider status for the signed-in learner. */
export const getAiStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const since = new Date();
    since.setUTCHours(0, 0, 0, 0);
    const [{ data: profile }, { count }] = await Promise.all([
      supabase.from("profiles").select("plan_tier").eq("id", userId).maybeSingle(),
      supabase
        .from("ai_generations")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("success", true)
        .gte("created_at", since.toISOString()),
    ]);
    const { dailyLimitFor } = await import("./config");
    return {
      tier: profile?.plan_tier ?? "free",
      used: count ?? 0,
      limit: dailyLimitFor(profile?.plan_tier),
      providers: activeProviders().map((p) => p.name),
    };
  });

/** Doubt solver — persists the conversation and returns the assistant reply. */
export const solveDoubt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ conversationId: z.string().uuid().nullable(), message: z.string().min(2).max(4000) })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    let conversationId = data.conversationId;
    if (!conversationId) {
      const { data: conv, error } = await supabase
        .from("ai_conversations")
        .insert({
          user_id: userId,
          title: data.message.slice(0, 60),
          kind: "doubt",
        })
        .select("id")
        .single();
      if (error) throw new Error("Could not start the conversation.");
      conversationId = conv.id as string;
    }

    const { data: history } = await supabase
      .from("ai_messages")
      .select("role, content")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(20);

    await supabase
      .from("ai_messages")
      .insert({ conversation_id: conversationId, user_id: userId, role: "user", content: data.message });

    const ctx = await buildLearnerContext(supabase, userId);
    const reply = await guarded(supabase, userId, "solveDoubt", async () => {
      const completion = await runCompletion({
        messages: [
          { role: "system", content: `${TUTOR_SYSTEM}\n\nLearner profile:\n${learnerBrief(ctx)}` },
          ...((history ?? []) as { role: "user" | "assistant"; content: string }[]),
          { role: "user", content: data.message },
        ],
      });
      return {
        result: completion.text,
        provider: completion.provider,
        model: completion.model,
        tokensUsed: completion.tokensUsed,
      };
    });

    await supabase
      .from("ai_messages")
      .insert({ conversation_id: conversationId, user_id: userId, role: "assistant", content: reply });
    await supabase
      .from("ai_conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", conversationId);

    return { conversationId, reply };
  });

/** Personalised daily coaching mission built from real activity. */
export const generateDailyPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const ctx = await buildLearnerContext(supabase, userId);
    const content = await guarded(supabase, userId, "askTutor", async () => {
      const completion = await runCompletion({
        messages: [
          { role: "system", content: COACH_SYSTEM },
          { role: "user", content: learnerBrief(ctx) },
        ],
      });
      return {
        result: completion.text,
        provider: completion.provider,
        model: completion.model,
        tokensUsed: completion.tokensUsed,
      };
    });
    return { content, context: ctx };
  });

/** Structured revision notes, saved to the learner's library. */
export const generateNotes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        topic: z.string().min(2).max(120),
        subject: z.string().max(120).optional(),
        difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
        exam: z.string().max(60).default("SSC CGL"),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const content = await guarded(supabase, userId, "generateNotes", async () => {
      const completion = await runCompletion({
        messages: [
          { role: "system", content: NOTES_SYSTEM },
          {
            role: "user",
            content: `Exam: ${data.exam}. Subject: ${data.subject ?? "general"}. Topic: ${data.topic}. Difficulty: ${data.difficulty}.`,
          },
        ],
      });
      return {
        result: completion.text,
        provider: completion.provider,
        model: completion.model,
        tokensUsed: completion.tokensUsed,
      };
    });

    const { data: note, error } = await supabase
      .from("ai_notes")
      .insert({
        user_id: userId,
        title: data.topic,
        topic: data.topic,
        subject: data.subject ?? null,
        difficulty: data.difficulty,
        content,
      })
      .select("*")
      .single();
    if (error) throw new Error("Notes were generated but could not be saved.");
    return note;
  });

const GeneratedQuestion = z.object({
  question_text: z.string().min(5),
  options: z.array(z.string().min(1)).length(4),
  correct_answer: z.string().min(1),
  explanation: z.string().min(3),
  difficulty: z.enum(["easy", "medium", "hard"]).catch("medium"),
});

/** AI question generator — output is validated before it is trusted or saved. */
export const generateQuestions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        exam: z.string().max(60).default("SSC CGL"),
        subject: z.string().max(120),
        topic: z.string().max(120),
        difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
        count: z.number().int().min(1).max(10).default(5),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const raw = await guarded(supabase, userId, "generateQuestions", async () => {
      const completion = await runCompletion({
        json: true,
        messages: [
          { role: "system", content: QUESTION_SYSTEM },
          {
            role: "user",
            content: `Generate ${data.count} ${data.difficulty} MCQs for ${data.exam}, subject ${data.subject}, topic ${data.topic}.`,
          },
        ],
      });
      return {
        result: completion.text,
        provider: completion.provider,
        model: completion.model,
        tokensUsed: completion.tokensUsed,
      };
    });

    let parsed: { questions?: unknown[] };
    try {
      parsed = parseJsonResponse<{ questions?: unknown[] }>(raw);
    } catch {
      throw new Error("The AI returned questions in an unreadable format. Try again.");
    }

    const valid = (parsed.questions ?? [])
      .map((q) => GeneratedQuestion.safeParse(q))
      .filter((r) => r.success)
      .map((r) => (r as { data: z.infer<typeof GeneratedQuestion> }).data)
      .filter((q) => q.options.includes(q.correct_answer));

    if (valid.length === 0) {
      throw new Error("The AI could not produce valid questions this time. Please retry.");
    }
    return { questions: valid, rejected: (parsed.questions ?? []).length - valid.length };
  });

/** Long-term study plan generated from the learner's real state. */
export const generateStudyPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        targetDate: z.string().max(20).nullable().default(null),
        dailyMinutes: z.number().int().min(15).max(720).default(90),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const ctx = await buildLearnerContext(supabase, userId);
    const content = await guarded(supabase, userId, "generateStudyPlan", async () => {
      const completion = await runCompletion({
        messages: [
          { role: "system", content: PLAN_SYSTEM },
          {
            role: "user",
            content: `${learnerBrief(ctx)}\nExam date: ${data.targetDate ?? "not fixed"}. Available daily minutes: ${data.dailyMinutes}.`,
          },
        ],
      });
      return {
        result: completion.text,
        provider: completion.provider,
        model: completion.model,
        tokensUsed: completion.tokensUsed,
      };
    });

    await supabase.from("ai_study_plans").update({ is_active: false }).eq("user_id", userId);
    const { data: plan, error } = await supabase
      .from("ai_study_plans")
      .insert({
        user_id: userId,
        exam_code: ctx.examName,
        target_date: data.targetDate,
        daily_minutes: data.dailyMinutes,
        content,
      })
      .select("*")
      .single();
    if (error) throw new Error("The plan was generated but could not be saved.");
    return plan;
  });

/** Post-test performance analysis based on the stored attempt. */
export const analyzePerformance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ attemptId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: attempt } = await supabase
      .from("test_attempts")
      .select("*, tests(title), test_answers(is_correct, selected_answer, time_taken_seconds, questions(question_text, difficulty, topics(name), subjects(name)))")
      .eq("id", data.attemptId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!attempt) throw new Error("That test attempt could not be found.");

    const answers = ((attempt as any).test_answers ?? []) as any[];
    const summary = answers
      .map(
        (a) =>
          `${a.questions?.subjects?.name ?? "?"} / ${a.questions?.topics?.name ?? "?"} | ${a.questions?.difficulty ?? "?"} | ${
            a.selected_answer ? (a.is_correct ? "correct" : "wrong") : "skipped"
          } | ${a.time_taken_seconds}s`,
      )
      .join("\n");

    const ctx = await buildLearnerContext(supabase, userId);
    return guarded(supabase, userId, "analyzePerformance", async () => {
      const completion = await runCompletion({
        messages: [
          { role: "system", content: ANALYSIS_SYSTEM },
          {
            role: "user",
            content: `${learnerBrief(ctx)}\n\nTest: ${(attempt as any).tests?.title}\nScore: ${attempt.score}/${attempt.max_marks} | Accuracy ${attempt.accuracy}% | Time ${Math.round((attempt.time_spent_seconds ?? 0) / 60)} min\nPer question (subject / topic | difficulty | result | time):\n${summary}`,
          },
        ],
      });
      return {
        result: completion.text,
        provider: completion.provider,
        model: completion.model,
        tokensUsed: completion.tokensUsed,
      };
    });
  });
