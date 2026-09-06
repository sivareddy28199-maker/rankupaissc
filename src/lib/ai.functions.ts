import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

import { runCompletion, parseJsonResponse, activeProviders } from "./ai/provider";
import {
  ANALYSIS_SYSTEM,
  CLASSIFY_SYSTEM,
  COACH_SYSTEM,
  MOCK_SYSTEM,
  NOTES_SYSTEM,
  PRACTICE_SYSTEM,
  QUESTION_SYSTEM,
  TUTOR_SYSTEM,
  learnerBrief,
} from "./ai/prompts";
import { MOCK_BLUEPRINT } from "./config";
import {
  buildLearnerContext,
  getExistingQuestionTexts,
  guarded,
  validateGeneratedQuestions,
} from "./ai.server";
import { SSC_SYLLABUS } from "./ssc";

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

/** AI question generator — validated, de-duplicated, retry-with-correction. */
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

    const existingTexts = await getExistingQuestionTexts(supabase, userId, data.subject, data.topic);

    let lastError: string | null = null;

    for (let attempt = 0; attempt < 3; attempt++) {
      const correction = attempt > 0
        ? `\n\nVALIDATION ERROR from previous attempt: ${lastError}. Please correct and regenerate.`
        : "";

      const raw = await guarded(supabase, userId, "generateQuestions", async () => {
        const completion = await runCompletion({
          json: true,
          messages: [
            { role: "system", content: QUESTION_SYSTEM },
            {
              role: "user",
              content: `Generate ${data.count} ${data.difficulty} MCQs for ${data.exam}, subject "${data.subject}", topic "${data.topic}".${correction}`,
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
        lastError = "AI returned invalid JSON format.";
        if (attempt === 2) throw new Error("The AI returned questions in an unreadable format. Please try again.");
        continue;
      }

      const valid = validateGeneratedQuestions(parsed.questions ?? [], existingTexts);

      if (valid.length === 0) {
        lastError = `All ${(parsed.questions ?? []).length} questions failed validation (shape, subject/topic mismatch, duplicate, or incorrect answer).`;
        if (attempt === 2) throw new Error("The AI could not produce valid questions this time. Please try again.");
        continue;
      }

      return {
        questions: valid,
        rejected: (parsed.questions ?? []).length - valid.length,
        attempts: attempt + 1,
      };
    }

    throw new Error("The AI could not produce valid questions this time. Please try again.");
  });

/** SSC CGL Mock Test — configurable by blueprint, validated, de-duplicated. */
export const generateDailyMock = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        blueprintType: z.enum(["tier-i-mock", "practice", "topic-test", "sectional-test"]).default("tier-i-mock"),
        customSections: z
          .array(
            z.object({
              subject: z.string().max(120),
              questions: z.number().int().min(1).max(100),
              easy: z.number().int().optional(),
              medium: z.number().int().optional(),
              hard: z.number().int().optional(),
            }),
          )
          .optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const existingTexts = await getExistingQuestionTexts(supabase, userId);

    let lastError: string | null = null;

    for (let attempt = 0; attempt < 3; attempt++) {
      const correction = attempt > 0
        ? `\n\nVALIDATION ERROR: ${lastError}. Please correct.`
        : "";

      const blueprint = data.blueprintType === "tier-i-mock" ? MOCK_BLUEPRINT :
        data.blueprintType === "topic-test" ? { exam: "SSC-CGL", testType: "topic-test", totalQuestions: 20, durationMinutes: 30, scoring: MOCK_BLUEPRINT.scoring, sections: data.customSections ?? [{ subject: "Quantitative Aptitude", questions: 20 }] } :
        data.blueprintType === "sectional-test" ? { exam: "SSC-CGL", testType: "sectional-test", totalQuestions: 25, durationMinutes: 25, scoring: MOCK_BLUEPRINT.scoring, sections: data.customSections ?? [{ subject: "Quantitative Aptitude", questions: 25 }] } :
        data.blueprintType === "practice" ? { exam: "SSC-CGL", testType: "practice", totalQuestions: 30, durationMinutes: 45, scoring: MOCK_BLUEPRINT.scoring, sections: data.customSections ?? [
          { subject: "Quantitative Aptitude", questions: 8 },
          { subject: "General Intelligence & Reasoning", questions: 7 },
          { subject: "English Language & Comprehension", questions: 8 },
          { subject: "General Awareness", questions: 7 },
        ] } :
        MOCK_BLUEPRINT;

      const blueprintStr = blueprint.sections
        .map((s) => `- ${s.subject}: ${s.questions} questions` + (s.easy ? ` (Easy: ${s.easy}, Medium: ${s.medium}, Hard: ${s.hard})` : ""))
        .join("\n");

      const raw = await guarded(supabase, userId, "generateDailyMock", async () => {
        const completion = await runCompletion({
          json: true,
          messages: [
            { role: "system", content: MOCK_SYSTEM },
            { role: "user", content: `Generate an SSC CGL mock (${blueprint.testType}) with the following blueprint (${blueprint.totalQuestions} total questions, ${blueprint.durationMinutes} min):\n${blueprintStr}\nDifficulty mix: easy/medium/hard per section. ${correction}` },
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
        lastError = "Invalid JSON.";
        if (attempt === 2) throw new Error("Mock generation failed. Please try again.");
        continue;
      }

      const questions = parsed.questions ?? [];
      const valid = validateGeneratedQuestions(questions, existingTexts);

      if (valid.length < 60) {
        lastError = `Only ${valid.length} of ${questions.length} questions passed validation. Need 60+ valid.`;
        if (attempt === 2) throw new Error("Mock generation failed quality check after 3 attempts.");
        continue;
      }

      const { data: subjects } = await supabase.from("subjects").select("id, name");
      const subjectMap = new Map((subjects ?? []).map((s: any) => [s.name, s.id] as const));
      const questionIds: string[] = [];

      for (const q of valid) {
        const subjectName = (q as any).subject || (q as any).validatedSubject;
        const subjectId = subjectMap.get(subjectName);
        if (!subjectId) continue;
        const { data: inserted, error } = await supabase
          .from("questions")
          .insert({
            question_text: q.question_text,
            question_type: "mcq",
            options: q.options,
            correct_answer: q.correct_answer,
            explanation: q.explanation,
            difficulty: q.difficulty,
            subject_id: subjectId,
            source: "ai-mock",
            is_published: false,
          })
          .select("id")
          .single();
        if (!error && inserted) questionIds.push(inserted.id);
      }

      if (questionIds.length < 30) {
        lastError = "Could not save enough mock questions.";
        if (attempt === 2) throw new Error("Mock generation failed during save.");
        continue;
      }

      const { data: test, error: testErr } = await supabase
        .from("tests")
        .insert({
          title: `Daily SSC CGL Mock — ${new Date().toLocaleDateString(undefined, { day: "numeric", month: "short" })}`,
          description: "AI-generated daily SSC CGL Tier-I mock with 4-section balance.",
          test_type: "mock",
          duration_minutes: 60,
          total_questions: questionIds.length,
          is_published: true,
          subject_id: null,
          topic_id: null,
        })
        .select("*")
        .single();
      if (testErr || !test) {
        throw new Error("Mock was generated but the test record could not be saved.");
      }

      await supabase.from("test_questions").insert(
        questionIds.map((qid, idx) => ({ test_id: test.id, question_id: qid, position: idx })),
      );

      return { test, questionCount: questionIds.length };
    }

    throw new Error("Mock generation failed after multiple attempts.");
  });

/** Personalised practice using the learner's weak topics. */
export const generatePersonalisedPractice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        mode: z.enum(["topic", "weak", "mixed", "difficulty"]).default("mixed"),
        subject: z.string().max(120).optional(),
        topic: z.string().max(120).optional(),
        difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
        count: z.number().int().min(5).max(20).default(10),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const ctx = await buildLearnerContext(supabase, userId);

    let subject = data.subject;
    let topic = data.topic;
    let difficulty = data.difficulty;

    if (data.mode === "weak" && ctx.weakTopics.length) {
      const first = ctx.weakTopics[0].split(" (")[0];
      topic = first;
    }

    if (data.mode === "difficulty") {
      difficulty = data.difficulty;
    }

    if (!subject) {
      if (data.mode === "weak" && topic) {
        for (const [s, topics] of Object.entries(SSC_SYLLABUS)) {
          if (topics.some((t) => t.toLowerCase() === topic!.toLowerCase())) {
            subject = s;
            break;
          }
        }
      }
      subject = subject ?? "Quantitative Aptitude";
    }

    const existingTexts = await getExistingQuestionTexts(supabase, userId, subject, topic);

    let lastError: string | null = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      const correction = attempt > 0 ? `\n\nFIX: ${lastError}` : "";
      const raw = await guarded(supabase, userId, "generatePersonalisedPractice", async () => {
        const completion = await runCompletion({
          json: true,
          messages: [
            { role: "system", content: PRACTICE_SYSTEM },
            {
              role: "user",
              content: `Mode: ${data.mode}. Subject: ${subject}. Topic: ${topic ?? "any"}. Difficulty: ${difficulty}. Count: ${data.count}.${correction}`,
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
        lastError = "Invalid JSON";
        if (attempt === 1) throw new Error("Practice generation failed.");
        continue;
      }

      const valid = validateGeneratedQuestions(parsed.questions ?? [], existingTexts);
      if (valid.length === 0) {
        lastError = "All questions failed validation.";
        if (attempt === 1) throw new Error("Practice generation failed quality check.");
        continue;
      }

      return { questions: valid, mode: data.mode, subject, topic, difficulty };
    }

    throw new Error("Practice generation failed.");
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

/* ------------------------------------------------------------------ */
/* Coach chat: one persisted conversation stream for every AI mode.     */
/* ------------------------------------------------------------------ */

const COACH_MODES = ["tutor", "notes", "questions"] as const;
export type CoachMode = (typeof COACH_MODES)[number];

function questionsToMarkdown(questions: { question_text: string; options: string[]; correct_answer: string; explanation: string }[]) {
  return questions
    .map((q, i) => {
      const opts = q.options
        .map((o, oi) => `${String.fromCharCode(65 + oi)}. ${o}${o === q.correct_answer ? "  ✅" : ""}`)
        .join("\n");
      return `**Q${i + 1}. ${q.question_text}**\n\n${opts}\n\n_${q.explanation}_`;
    })
    .join("\n\n---\n\n");
}

/**
 * Sends one message in a coach conversation. Works for every mode and always
 * persists the user message and the assistant reply against the signed-in user.
 */
export const sendCoachMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        conversationId: z.string().uuid().nullable().default(null),
        mode: z.enum(COACH_MODES).default("tutor"),
        message: z.string().min(2).max(4000),
        subject: z.string().max(120).optional(),
        difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
        dailyMinutes: z.number().int().min(15).max(720).default(90),
        targetDate: z.string().max(20).nullable().default(null),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    let conversationId = data.conversationId;
    if (!conversationId) {
      const { data: conv, error } = await supabase
        .from("ai_conversations")
        .insert({ user_id: userId, title: data.message.slice(0, 60), kind: data.mode })
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

    await supabase.from("ai_messages").insert({
      conversation_id: conversationId,
      user_id: userId,
      role: "user",
      content: data.message,
    });

    const ctx = await buildLearnerContext(supabase, userId);
    let reply: string;

    if (data.mode === "notes") {
      const content = await guarded(supabase, userId, "generateNotes", async () => {
        const completion = await runCompletion({
          messages: [
            { role: "system", content: NOTES_SYSTEM },
            {
              role: "user",
              content: `Exam: ${ctx.examName}. Subject: ${data.subject ?? "general"}. Topic: ${data.message}. Difficulty: ${data.difficulty}.`,
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
      await supabase.from("ai_notes").insert({
        user_id: userId,
        title: data.message.slice(0, 120),
        topic: data.message.slice(0, 120),
        subject: data.subject ?? null,
        difficulty: data.difficulty,
        content,
      });
      reply = content;
    } else if (data.mode === "questions") {
      const raw = await guarded(supabase, userId, "generateQuestions", async () => {
        const completion = await runCompletion({
          json: true,
          messages: [
            { role: "system", content: QUESTION_SYSTEM },
            {
              role: "user",
              content: `Generate 5 ${data.difficulty} MCQs for ${ctx.examName}, subject ${data.subject ?? "general"}, topic ${data.message}.`,
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
      const valid = validateGeneratedQuestions(parsed.questions ?? []);
      if (valid.length === 0) throw new Error("The AI could not produce valid questions this time. Please retry.");
      reply = questionsToMarkdown(valid);
    } else if (data.mode === "plan") {
      const content = await guarded(supabase, userId, "generateStudyPlan", async () => {
        const completion = await runCompletion({
          messages: [
            { role: "system", content: PLAN_SYSTEM },
            {
              role: "user",
              content: `${learnerBrief(ctx)}\nExam date: ${data.targetDate ?? "not fixed"}. Available daily minutes: ${data.dailyMinutes}.\nRequest: ${data.message}`,
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
      await supabase.from("ai_study_plans").insert({
        user_id: userId,
        exam_code: ctx.examName,
        target_date: data.targetDate,
        daily_minutes: data.dailyMinutes,
        content,
      });
      reply = content;
    } else {
      reply = await guarded(supabase, userId, "solveDoubt", async () => {
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
    }

    await supabase.from("ai_messages").insert({
      conversation_id: conversationId,
      user_id: userId,
      role: "assistant",
      content: reply,
    });
    await supabase
      .from("ai_conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", conversationId);

    return { conversationId, reply };
  });
