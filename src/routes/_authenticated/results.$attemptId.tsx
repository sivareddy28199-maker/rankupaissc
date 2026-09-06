import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { analyzePerformance } from "@/lib/ai.functions";
import { getAttemptAnswerKeys, type AnswerKey } from "@/lib/questions.functions";
import { PageHeader } from "@/components/AppShell";
import { ClayCard } from "@/components/kit";
import { ErrorState, LoadingState } from "@/components/States";
import { Markdown } from "@/components/Markdown";
import { QuestionCard, type QuestionShape } from "@/components/QuestionCard";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatClock } from "@/lib/study";

export const Route = createFileRoute("/_authenticated/results/$attemptId")({
  head: () => ({
    meta: [
      { title: "Test result — RankUp AI" },
      { name: "description", content: "Score, accuracy, subject-wise performance and weak topics." },
      { property: "og:title", content: "Test result — RankUp AI" },
      { property: "og:description", content: "Score, accuracy and weak-topic breakdown." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResultPage,
});

function ResultPage() {
  const { attemptId } = Route.useParams();
  const navigate = useNavigate();
  const [analysis, setAnalysis] = useState<string | null>(null);
  const runAnalysis = useServerFn(analyzePerformance);

  const result = useQuery({
    queryKey: ["attempt", attemptId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("test_attempts")
        .select(
          "*, tests(id, title), test_answers(selected_answer, is_correct, time_taken_seconds, questions(id, question_text, options, difficulty, topics(name), subjects(name)))",
        )
        .eq("id", attemptId)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Attempt not found");
      return data;
    },
  });

  const loadKeys = useServerFn(getAttemptAnswerKeys);
  const answerKeys = useQuery({
    queryKey: ["attempt-keys", attemptId],
    queryFn: async () => (await loadKeys({ data: { attemptId } })) as AnswerKey[],
  });

  const analyse = useMutation({
    mutationFn: async () => runAnalysis({ data: { attemptId } }),
    onSuccess: (text) => setAnalysis(text as string),
    onError: (error: Error) => toast.error(error.message),
  });

  if (result.isLoading) return <LoadingState label="Loading your result…" />;
  if (result.isError) return <ErrorState onRetry={() => result.refetch()} />;

  const attempt = result.data as any;
  const answers = (attempt.test_answers ?? []) as any[];
  const percentage =
    Number(attempt.max_marks) > 0
      ? Math.round((Number(attempt.score) / Number(attempt.max_marks)) * 1000) / 10
      : 0;

  const bySubject = new Map<string, { c: number; t: number }>();
  const byTopic = new Map<string, { c: number; t: number }>();
  for (const answer of answers) {
    const subject = answer.questions?.subjects?.name ?? "Other";
    const topic = answer.questions?.topics?.name ?? "Other";
    for (const [map, key] of [
      [bySubject, subject],
      [byTopic, topic],
    ] as const) {
      const acc = map.get(key) ?? { c: 0, t: 0 };
      acc.t += 1;
      if (answer.is_correct) acc.c += 1;
      map.set(key, acc);
    }
  }
  const keyById = new Map(
    ((answerKeys.data ?? []) as AnswerKey[]).map((k) => [k.question_id, k]),
  );

  const weakTopics = [...byTopic.entries()]
    .map(([name, v]) => ({ name, acc: Math.round((v.c / v.t) * 100), t: v.t }))
    .sort((a, b) => a.acc - b.acc)
    .filter((t) => t.acc < 70)
    .slice(0, 5);

  return (
    <>
      <PageHeader eyebrow="Result" title="Test result" description={attempt.tests?.title} />

      <ClayCard tone="primary" className="reveal" aria-label="Score summary">
        <p className="font-display text-5xl leading-none">
          {Number(attempt.score)}
          <span className="text-xl opacity-70"> / {Number(attempt.max_marks)}</span>
        </p>
        <p className="mt-1.5 text-sm font-bold opacity-80">{percentage}% of maximum marks</p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Metric label="Correct" value={attempt.correct_count} />
          <Metric label="Wrong" value={attempt.wrong_count} />
          <Metric label="Skipped" value={attempt.skipped_count} />
          <Metric label="Accuracy" value={`${Number(attempt.accuracy)}%`} />
        </div>
        <p className="mt-3 text-sm font-bold opacity-80">
          Time used: {formatClock(attempt.time_spent_seconds ?? 0)}
        </p>
      </ClayCard>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button onClick={() => analyse.mutate()} disabled={analyse.isPending}>
          <Sparkles className="size-4" aria-hidden />
          {analyse.isPending ? "Analysing…" : "AI performance analysis"}
        </Button>
        <Button
          variant="outline"
          onClick={() => navigate({ to: "/tests/$testId", params: { testId: attempt.tests.id } })}
        >
          Retry test
        </Button>
        <Button variant="outline" asChild>
          <Link to="/practice">Practise weak topics</Link>
        </Button>
      </div>

      {analysis ? (
        <ClayCard tone="ink" className="reveal mt-4">
          <p className="mb-2 inline-flex items-center gap-2 rounded-full border-2 border-border bg-primary px-3 py-1 text-xs font-extrabold text-primary-foreground">
            AI analysis
          </p>
          <Markdown content={analysis} />
        </ClayCard>
      ) : null}

      <Tabs defaultValue="breakdown" className="mt-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="breakdown">Breakdown</TabsTrigger>
          <TabsTrigger value="review">Review answers</TabsTrigger>
        </TabsList>

        <TabsContent value="breakdown" className="mt-4 space-y-4">
          <ClayCard tone="sky" className="reveal">
            <h2 className="mb-3 font-display text-xl">Subject-wise performance</h2>
            <ul className="space-y-2">
              {[...bySubject.entries()].map(([name, v]) => (
                <li
                  key={name}
                  className="clay-sm flex items-center justify-between gap-2 bg-card px-3.5 py-2.5 text-sm text-foreground"
                >
                  <span className="font-bold">{name}</span>
                  <span className="font-extrabold">
                    {v.c}/{v.t} · {Math.round((v.c / v.t) * 100)}%
                  </span>
                </li>
              ))}
            </ul>
          </ClayCard>
          <ClayCard tone="coral" className="reveal">
            <h2 className="mb-3 font-display text-xl">Topic weaknesses</h2>
            {weakTopics.length ? (
              <ul className="space-y-2">
                {weakTopics.map((topic) => (
                  <li
                    key={topic.name}
                    className="clay-sm flex items-center justify-between gap-2 bg-card px-3.5 py-2.5 text-sm text-foreground"
                  >
                    <span className="font-bold">{topic.name}</span>
                    <span className="font-extrabold">{topic.acc}%</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm font-semibold">No weak topics in this paper. Strong work.</p>
            )}
          </ClayCard>
        </TabsContent>

        <TabsContent value="review" className="mt-4 space-y-4">
          {answers.map((answer, i) => (
            <QuestionCard
              key={answer.questions?.id ?? i}
              question={
                {
                  ...(answer.questions as QuestionShape),
                  correct_answer: keyById.get(answer.questions?.id)?.correct_answer ?? null,
                  explanation: keyById.get(answer.questions?.id)?.explanation ?? null,
                } as QuestionShape
              }
              index={i}
              total={answers.length}
              selected={answer.selected_answer}
              onSelect={() => undefined}
              revealed
              disabled
            />
          ))}
        </TabsContent>
      </Tabs>
    </>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="clay-sm bg-card p-3 text-foreground">
      <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-display text-xl leading-none">{value}</p>
    </div>
  );
}
