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
  const weakTopics = [...byTopic.entries()]
    .map(([name, v]) => ({ name, acc: Math.round((v.c / v.t) * 100), t: v.t }))
    .sort((a, b) => a.acc - b.acc)
    .filter((t) => t.acc < 70)
    .slice(0, 5);

  return (
    <>
      <PageHeader title="Test result" description={attempt.tests?.title} />

      <section className="surface p-5" aria-label="Score summary">
        <p className="font-display text-4xl font-semibold">
          {Number(attempt.score)}
          <span className="text-lg text-muted-foreground"> / {Number(attempt.max_marks)}</span>
        </p>
        <p className="mt-1 text-sm text-muted-foreground">{percentage}% of maximum marks</p>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Metric label="Correct" value={attempt.correct_count} tone="text-success" />
          <Metric label="Wrong" value={attempt.wrong_count} tone="text-destructive" />
          <Metric label="Skipped" value={attempt.skipped_count} />
          <Metric label="Accuracy" value={`${Number(attempt.accuracy)}%`} />
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          Time used: {formatClock(attempt.time_spent_seconds ?? 0)}
        </p>
      </section>

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
        <section className="surface mt-4 p-4">
          <Markdown content={analysis} />
        </section>
      ) : null}

      <Tabs defaultValue="breakdown" className="mt-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="breakdown">Breakdown</TabsTrigger>
          <TabsTrigger value="review">Review answers</TabsTrigger>
        </TabsList>

        <TabsContent value="breakdown" className="mt-4 space-y-4">
          <section className="surface p-4">
            <h2 className="mb-3 text-sm font-semibold">Subject-wise performance</h2>
            <ul className="space-y-2">
              {[...bySubject.entries()].map(([name, v]) => (
                <li key={name} className="flex items-center justify-between text-sm">
                  <span>{name}</span>
                  <span className="font-medium">
                    {v.c}/{v.t} · {Math.round((v.c / v.t) * 100)}%
                  </span>
                </li>
              ))}
            </ul>
          </section>
          <section className="surface p-4">
            <h2 className="mb-3 text-sm font-semibold">Topic weaknesses</h2>
            {weakTopics.length ? (
              <ul className="space-y-2">
                {weakTopics.map((topic) => (
                  <li key={topic.name} className="flex items-center justify-between text-sm">
                    <span>{topic.name}</span>
                    <span className="font-medium text-destructive">{topic.acc}%</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No weak topics in this paper. Strong work.</p>
            )}
          </section>
        </TabsContent>

        <TabsContent value="review" className="mt-4 space-y-4">
          {answers.map((answer, i) => (
            <QuestionCard
              key={answer.questions?.id ?? i}
              question={answer.questions as QuestionShape}
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

function Metric({ label, value, tone }: { label: string; value: number | string; tone?: string }) {
  return (
    <div className="rounded-xl bg-muted/60 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-0.5 font-display text-xl font-semibold ${tone ?? ""}`}>{value}</p>
    </div>
  );
}
