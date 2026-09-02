import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Flag, Timer } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/AppShell";
import { ErrorState, LoadingState } from "@/components/States";
import { QuestionCard, type QuestionShape } from "@/components/QuestionCard";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DEFAULT_SCORING } from "@/lib/config";
import { formatClock, recordActivity } from "@/lib/study";
import { submitTestAttempt } from "@/lib/questions.functions";

export const Route = createFileRoute("/_authenticated/tests/$testId")({
  head: () => ({
    meta: [
      { title: "Test in progress — RankUp AI" },
      { name: "description", content: "Timed mock test with question palette and auto-save." },
      { property: "og:title", content: "Test in progress — RankUp AI" },
      { property: "og:description", content: "Timed mock test with question palette and auto-save." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TestRunner,
});

interface AnswerState {
  selected: string | null;
  marked: boolean;
  seconds: number;
}

function TestRunner() {
  const { testId } = Route.useParams();
  const navigate = useNavigate();
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, AnswerState>>({});
  const [elapsed, setElapsed] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const questionStart = useRef(Date.now());

  const setup = useQuery({
    queryKey: ["test-setup", testId],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;
      if (!userId) throw new Error("Not signed in");

      const { data: test, error: testError } = await supabase
        .from("tests")
        .select("*, exams(marks_correct, marks_wrong, marks_skipped)")
        .eq("id", testId)
        .maybeSingle();
      if (testError || !test) throw new Error("Test not found");

      const { data: rows, error: qError } = await supabase
        .from("test_questions")
        .select("position, questions(id, question_text, options, difficulty, topics(name), subjects(name))")
        .eq("test_id", testId)
        .order("position");
      if (qError) throw qError;
      const questions = (rows ?? [])
        .map((r) => (r as any).questions)
        .filter(Boolean) as QuestionShape[];

      const { data: existing } = await supabase
        .from("test_attempts")
        .select("id, started_at")
        .eq("test_id", testId)
        .eq("user_id", userId)
        .eq("status", "in_progress")
        .maybeSingle();

      let attemptId = existing?.id as string | undefined;
      let startedAt = existing?.started_at as string | undefined;
      if (!attemptId) {
        const { data: created, error } = await supabase
          .from("test_attempts")
          .insert({ user_id: userId, test_id: testId, max_marks: 0 })
          .select("id, started_at")
          .single();
        if (error) throw error;
        attemptId = created.id as string;
        startedAt = created.started_at as string;
      }

      const { data: saved } = await supabase
        .from("test_answers")
        .select("question_id, selected_answer, marked_for_review, time_taken_seconds")
        .eq("attempt_id", attemptId);

      return { test, questions, attemptId, startedAt: startedAt!, saved: saved ?? [], userId };
    },
  });

  useEffect(() => {
    if (!setup.data) return;
    const restored: Record<string, AnswerState> = {};
    for (const row of setup.data.saved) {
      restored[row.question_id] = {
        selected: row.selected_answer,
        marked: row.marked_for_review,
        seconds: row.time_taken_seconds ?? 0,
      };
    }
    setAnswers(restored);
  }, [setup.data]);

  const durationSeconds = (setup.data?.test?.duration_minutes ?? 60) * 60;

  useEffect(() => {
    if (!setup.data) return;
    const started = new Date(setup.data.startedAt).getTime();
    const tick = () => setElapsed(Math.floor((Date.now() - started) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [setup.data]);

  const questions = setup.data?.questions ?? [];
  const current = questions[index];

  const persist = useCallback(
    async (questionId: string, state: AnswerState) => {
      if (!setup.data) return;
      await supabase.from("test_answers").upsert(
        {
          attempt_id: setup.data.attemptId,
          user_id: setup.data.userId,
          question_id: questionId,
          selected_answer: state.selected,
          marked_for_review: state.marked,
          time_taken_seconds: state.seconds,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "attempt_id,question_id" },
      );
    },
    [setup.data],
  );

  function update(questionId: string, patch: Partial<AnswerState>) {
    setAnswers((prev) => {
      const base = prev[questionId] ?? { selected: null, marked: false, seconds: 0 };
      const spent = Math.round((Date.now() - questionStart.current) / 1000);
      const next = { ...base, ...patch, seconds: base.seconds + spent };
      questionStart.current = Date.now();
      void persist(questionId, next);
      return { ...prev, [questionId]: next };
    });
  }

  const gradeAttempt = useServerFn(submitTestAttempt);

  const submit = useCallback(
    async (auto = false) => {
      if (!setup.data || submitting) return;
      setSubmitting(true);
      try {
        const result = (await gradeAttempt({
          data: { attemptId: setup.data.attemptId, timeSpentSeconds: elapsed },
        })) as { attempted: number };

        await recordActivity({
          userId: setup.data.userId,
          activity: "mock_test",
          minutes: Math.max(1, Math.round(elapsed / 60)),
          questions: result.attempted,
        });

        if (auto) toast.info("Time is up — your test was submitted automatically.");
        navigate({ to: "/results/$attemptId", params: { attemptId: setup.data.attemptId } });
      } catch (error) {
        setSubmitting(false);
        toast.error(error instanceof Error ? error.message : "Could not submit the test.");
      }
    },
    [elapsed, gradeAttempt, navigate, setup.data, submitting],
  );

  useEffect(() => {
    if (setup.data && elapsed >= durationSeconds && !submitting) void submit(true);
  }, [elapsed, durationSeconds, setup.data, submit, submitting]);

  const stats = useMemo(() => {
    const answered = questions.filter((q) => answers[q.id]?.selected).length;
    const marked = questions.filter((q) => answers[q.id]?.marked).length;
    return { answered, marked, left: questions.length - answered };
  }, [answers, questions]);

  if (setup.isLoading) return <LoadingState label="Preparing your test…" />;
  if (setup.isError || !current)
    return <ErrorState message="This test could not be loaded." onRetry={() => setup.refetch()} />;

  const remaining = Math.max(0, durationSeconds - elapsed);

  return (
    <>
      <PageHeader
        title={setup.data!.test.title}
        description={`${stats.answered} answered · ${stats.left} left · ${stats.marked} marked`}
        action={
          <span
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold tabular-nums",
              remaining < 120 ? "bg-destructive/10 text-destructive" : "bg-muted",
            )}
            role="timer"
            aria-live="off"
          >
            <Timer className="size-4" aria-hidden />
            {formatClock(remaining)}
          </span>
        }
      />

      <QuestionCard
        question={current}
        index={index}
        total={questions.length}
        selected={answers[current.id]?.selected ?? null}
        onSelect={(value) => update(current.id, { selected: value })}
      />

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          variant="outline"
          disabled={index === 0}
          onClick={() => {
            setIndex((i) => Math.max(0, i - 1));
            questionStart.current = Date.now();
          }}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          onClick={() => update(current.id, { marked: !answers[current.id]?.marked })}
        >
          <Flag className="size-4" aria-hidden />
          {answers[current.id]?.marked ? "Unmark" : "Mark for review"}
        </Button>
        <Button variant="ghost" onClick={() => update(current.id, { selected: null })}>
          Clear
        </Button>
        <Button
          className="ml-auto"
          disabled={index >= questions.length - 1}
          onClick={() => {
            setIndex((i) => Math.min(questions.length - 1, i + 1));
            questionStart.current = Date.now();
          }}
        >
          Next
        </Button>
      </div>

      <section className="surface mt-5 p-4" aria-labelledby="palette">
        <h2 id="palette" className="mb-3 text-sm font-semibold">
          Question palette
        </h2>
        <div className="grid grid-cols-8 gap-2 sm:grid-cols-10">
          {questions.map((question, i) => {
            const state = answers[question.id];
            return (
              <button
                key={question.id}
                type="button"
                aria-label={`Go to question ${i + 1}`}
                aria-current={i === index}
                onClick={() => {
                  setIndex(i);
                  questionStart.current = Date.now();
                }}
                className={cn(
                  "grid aspect-square place-items-center rounded-lg border text-sm font-medium transition-colors",
                  i === index && "ring-2 ring-ring ring-offset-1",
                  state?.marked
                    ? "border-warning bg-warning/20"
                    : state?.selected
                      ? "border-success bg-success/15"
                      : "border-border bg-muted/40 text-muted-foreground",
                )}
              >
                {i + 1}
              </button>
            );
          })}
        </div>
        <Button className="mt-4 w-full" onClick={() => submit(false)} disabled={submitting}>
          {submitting ? "Submitting…" : "Submit test"}
        </Button>
      </section>
    </>
  );
}
