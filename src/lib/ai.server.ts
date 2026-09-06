import type { SupabaseClient } from "@supabase/supabase-js";
import { dailyLimitFor } from "./config";
import type { LearnerContext } from "./ai/prompts";
import { AiLimitError } from "./ai/types";
import { z } from "zod";
import { AiUnavailableError } from "./ai/types";
import {
  SSC_SUBJECTS,
  SSC_SYLLABUS,
  type SscSubject,
} from "./ssc";

type Db = SupabaseClient<any, "public", any>;

export async function assertWithinAiBudget(supabase: Db, userId: string) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("plan_tier")
    .eq("id", userId)
    .maybeSingle();
  const limit = dailyLimitFor(profile?.plan_tier);
  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  const { count } = await supabase
    .from("ai_generations")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("success", true)
    .gte("created_at", since.toISOString());
  if ((count ?? 0) >= limit) {
    throw new AiLimitError(
      `You have used all ${limit} AI requests for today. The limit resets at midnight UTC.`,
    );
  }
  return { used: count ?? 0, limit };
}

export async function logGeneration(
  supabase: Db,
  userId: string,
  entry: {
    capability: string;
    provider: string;
    model?: string;
    tokensUsed?: number;
    success: boolean;
    errorMessage?: string;
  },
) {
  await supabase.from("ai_generations").insert({
    user_id: userId,
    capability: entry.capability,
    provider: entry.provider,
    model: entry.model ?? null,
    tokens_used: entry.tokensUsed ?? 0,
    success: entry.success,
    error_message: entry.errorMessage ?? null,
  });
}

export async function buildLearnerContext(supabase: Db, userId: string): Promise<LearnerContext> {
  const [{ data: profile }, { data: practice }, { data: attempts }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    supabase
      .from("practice_answers")
      .select("is_correct, question_id, questions(topic_id, topics(name))")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(500),
    supabase
      .from("test_attempts")
      .select("score, max_marks, accuracy, status")
      .eq("user_id", userId)
      .eq("status", "submitted"),
  ]);

  const rows = (practice ?? []) as any[];
  const total = rows.length;
  const correct = rows.filter((r) => r.is_correct).length;
  const byTopic = new Map<string, { c: number; t: number }>();
  for (const row of rows) {
    const name = row.questions?.topics?.name;
    if (!name) continue;
    const acc = byTopic.get(name) ?? { c: 0, t: 0 };
    acc.t += 1;
    if (row.is_correct) acc.c += 1;
    byTopic.set(name, acc);
  }
  const ranked = [...byTopic.entries()]
    .filter(([, v]) => v.t >= 3)
    .map(([name, v]) => ({ name, acc: (v.c / v.t) * 100 }))
    .sort((a, b) => a.acc - b.acc);

  const submitted = (attempts ?? []) as any[];
  const avgScore = submitted.length
    ? Math.round(
        (submitted.reduce(
          (sum, a) => sum + (a.max_marks > 0 ? (Number(a.score) / Number(a.max_marks)) * 100 : 0),
          0,
        ) /
          submitted.length) *
          10,
      ) / 10
    : 0;

  return {
    fullName: profile?.full_name ?? null,
    examName: profile?.target_exam_code ?? "SSC-CGL",
    targetYear: profile?.target_year ?? new Date().getFullYear() + 1,
    targetDate: profile?.target_date ?? null,
    studyLevel: profile?.study_level ?? "beginner",
    dailyMinutes: profile?.daily_minutes_goal ?? 90,
    accuracy: total ? Math.round((correct / total) * 1000) / 10 : 0,
    questionsAttempted: total,
    testsCompleted: submitted.length,
    averageScore: avgScore,
    weakTopics: ranked.slice(0, 5).map((r) => `${r.name} (${Math.round(r.acc)}%)`),
    strongTopics: ranked
      .slice(-3)
      .reverse()
      .filter((r) => r.acc >= 70)
      .map((r) => `${r.name} (${Math.round(r.acc)}%)`),
  };
}

export function toClientError(error: unknown): Error {
  if (error instanceof AiLimitError || error instanceof AiUnavailableError) {
    return new Error(error.message);
  }
  console.error("[ai] unexpected failure", error);
  return new Error("Something went wrong while contacting the AI. Please try again.");
}

export async function guarded<T>(
  supabase: Db,
  userId: string,
  capability: string,
  work: () => Promise<{ result: T; provider: string; model: string; tokensUsed: number }>,
): Promise<T> {
  try {
    await assertWithinAiBudget(supabase, userId);
    const { result, provider, model, tokensUsed } = await work();
    await logGeneration(supabase, userId, {
      capability,
      provider,
      model,
      tokensUsed,
      success: true,
    });
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

/* -------------------------------------------------------------------------- */
/*  Question validation — strict quality gate before any question is shown/saved  */
/* -------------------------------------------------------------------------- */

const GeneratedQuestion = z.object({
  question_text: z.string().min(5),
  options: z.array(z.string().min(1)).length(4),
  correct_answer: z.string().min(1),
  explanation: z.string().min(3),
  difficulty: z.enum(["easy", "medium", "hard"]).catch("medium"),
  subject: z.string().optional(),
  topic: z.string().optional(),
});

export type ValidatedQuestion = z.infer<typeof GeneratedQuestion> & {
  validatedSubject?: string;
  validatedTopic?: string;
};

function normalise(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]/g, " ").replace(/\s+/g, " ").trim();
}

function isSimilar(a: string, b: string): boolean {
  const na = normalise(a);
  const nb = normalise(b);
  if (na === nb) return true;
  if (na.length < 4 || nb.length < 4) return false;
  if (na.includes(nb) || nb.includes(na)) return true;
  const wordsA = new Set(na.split(" ").filter((w) => w.length > 3));
  const wordsB = new Set(nb.split(" ").filter((w) => w.length > 3));
  const overlap = [...wordsA].filter((w) => wordsB.has(w)).length;
  return overlap >= Math.min(wordsA.size, wordsB.size) * 0.75;
}

function validateSubjectTopic(subject: string | undefined, topic: string | undefined): {
  subject: string;
  topic: string;
} | null {
  if (!subject || !topic) return null;
  const s = SSC_SUBJECTS.find(
    (s) => normalise(s) === normalise(subject) || SUBJECT_ALIASES[normalise(subject)] === s,
  );
  if (!s) return null;
  const topics = SSC_SYLLABUS[s as SscSubject] ?? [];
  const t = topics.find(
    (tp) => normalise(tp) === normalise(topic) || normalise(topic).includes(normalise(tp)),
  );
  if (!t) return null;
  return { subject: s, topic: t };
}

const SUBJECT_ALIASES: Record<string, string> = {
  quant: "Quantitative Aptitude",
  quantitative: "Quantitative Aptitude",
  "quantitative aptitude": "Quantitative Aptitude",
  reasoning: "General Intelligence & Reasoning",
  "general intelligence": "General Intelligence & Reasoning",
  gi: "General Intelligence & Reasoning",
  english: "English Language & Comprehension",
  "english language": "English Language & Comprehension",
  elc: "English Language & Comprehension",
  ga: "General Awareness",
  "general awareness": "General Awareness",
  awareness: "General Awareness",
};

function extractMathAnswer(
  questionText: string,
  options: string[],
  correctAnswer: string,
): string | null {
  const nums = questionText.match(/\d+/g)?.map(Number) ?? [];
  if (nums.length < 2) return null;
  const [a, b] = nums;
  const [c] = nums.slice(2);
  const q = normalise(questionText);

  if (q.includes("sum") || q.includes("total") || q.includes("add")) {
    return String(a + b);
  }
  if (q.includes("differ")) return String(Math.abs(a - b));
  if (q.includes("product") || q.includes("multiply")) return String(a * b);
  if (q.includes("quotient") || q.includes("divide")) return b !== 0 ? String(Math.floor(a / b)) : null;
  if (q.includes("average") || q.includes("mean")) {
    const sum = nums.reduce((s, n) => s + n, 0);
    return String(Math.round(sum / nums.length));
  }
  if (q.includes("percentage") || q.includes("percent")) {
    if (c !== undefined) return String(Math.round((a / b) * 100));
    return null;
  }
  if (q.includes("profit") || q.includes("loss")) {
    if (c !== undefined) {
      const p = ((a - b) / b) * 100;
      return String(Math.round(p * 10) / 10);
    }
    return null;
  }
  if (q.includes("simple interest")) {
    const rate = nums[2] ?? 10;
    const time = nums[3] ?? 1;
    return String(Math.round((a * rate * time) / 100));
  }
  if (q.includes("compound")) {
    const rate = nums[2] ?? 10;
    const time = nums[3] ?? 1;
    return String(Math.round(a * Math.pow(1 + rate / 100, time)));
  }
  if (q.includes("speed") || q.includes("distance")) {
    if (q.includes("time")) {
      const speed = nums[0] ?? 1;
      const time = nums[1] ?? 1;
      return String(speed * time);
    }
    return null;
  }
  return null;
}

function validateQuantAnswer(questionText: string, options: string[], correctAnswer: string): boolean {
  const computed = extractMathAnswer(questionText, options, correctAnswer);
  if (!computed) return true;
  const normalised = normalise(correctAnswer);
  const expectedNum = parseFloat(computed);
  const correctNum = parseFloat(correctAnswer.replace(/[^0-9.]/g, ""));
  if (!isNaN(expectedNum) && !isNaN(correctNum)) {
    return Math.abs(expectedNum - correctNum) < 1;
  }
  return normalise(correctAnswer).includes(computed) || normalise(computed).includes(normalise(correctAnswer).replace(/[^a-z0-9]/g, ""));
}

export function validateGeneratedQuestions(
  items: unknown[],
  existingTexts: string[] = [],
): ValidatedQuestion[] {
  return items
    .map((q) => GeneratedQuestion.safeParse(q))
    .filter((r): r is { success: true; data: z.infer<typeof GeneratedQuestion> } => r.success)
    .map((r) => r.data)
    .filter((q) => q.options.includes(q.correct_answer))
    .filter((q) => {
      const qt = normalise(q.question_text);
      return !existingTexts.some((t) => isSimilar(qt, normalise(t)));
    })
    .filter((q) => {
      const stv = validateSubjectTopic(q.subject, q.topic);
      return stv !== null;
    })
    .filter((q) => {
      if (q.subject && normalise(q.subject).match(/quant|percentage|profit|speed|distance|average|interest|ratio/)) {
        return validateQuantAnswer(q.question_text, q.options, q.correct_answer);
      }
      return true;
    })
    .map((q) => {
      const stv = validateSubjectTopic(q.subject, q.topic);
      return {
        ...q,
        subject: stv?.subject ?? q.subject,
        topic: stv?.topic ?? q.topic,
        validatedSubject: stv?.subject,
        validatedTopic: stv?.topic,
      } as ValidatedQuestion;
    });
}

export async function getExistingQuestionTexts(
  supabase: Db,
  userId: string,
  subject?: string,
  topic?: string,
): Promise<string[]> {
  let query = supabase.from("questions").select("question_text");
  if (subject) {
    const { data: sub } = await supabase
      .from("subjects")
      .select("id")
      .eq("name", subject)
      .maybeSingle();
    if (sub) {
      query = query.eq("subject_id", sub.id);
      if (topic) {
        const { data: tp } = await supabase
          .from("topics")
          .select("id")
          .eq("subject_id", sub.id)
          .eq("name", topic)
          .maybeSingle();
        if (tp) query = query.eq("topic_id", tp.id);
      }
    }
  }
  const { data } = await query.limit(500);
  return (data ?? []).map((q: any) => q.question_text);
}
