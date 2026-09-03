import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Clock, Flame, Percent, Target } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/AppShell";
import { EmptyState, ErrorState, LoadingState } from "@/components/States";
import { ClayCard, ClayProgress, StatCard } from "@/components/kit";

export const Route = createFileRoute("/_authenticated/progress")({
  head: () => ({
    meta: [
      { title: "Progress — RankUp AI" },
      {
        name: "description",
        content: "Track accuracy, study time, streaks and subject-wise strength over time.",
      },
      { property: "og:title", content: "Progress — RankUp AI" },
      { property: "og:description", content: "Accuracy, study time and subject strength analytics." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProgressPage,
});

function ProgressPage() {
  const stats = useQuery({
    queryKey: ["progress"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;
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

  if (stats.isLoading) return <LoadingState label="Crunching your numbers…" />;
  if (stats.isError) return <ErrorState onRetry={() => stats.refetch()} />;

  const answers = stats.data!.answers as any[];
  const total = answers.length;
  const correct = answers.filter((a) => a.is_correct).length;
  const accuracy = total ? Math.round((correct / total) * 1000) / 10 : 0;
  const avgTime = total
    ? Math.round(answers.reduce((sum, a) => sum + (a.time_taken_seconds ?? 0), 0) / total)
    : 0;

  const bySubject = new Map<string, { c: number; t: number }>();
  const byTopic = new Map<string, { c: number; t: number }>();
  for (const answer of answers) {
    const name = answer.questions?.subjects?.name ?? "Other";
    const acc = bySubject.get(name) ?? { c: 0, t: 0 };
    acc.t += 1;
    if (answer.is_correct) acc.c += 1;
    bySubject.set(name, acc);

    const topic = answer.questions?.topics?.name;
    if (topic) {
      const t = byTopic.get(topic) ?? { c: 0, t: 0 };
      t.t += 1;
      if (answer.is_correct) t.c += 1;
      byTopic.set(topic, t);
    }
  }

  const weakTopics = [...byTopic.entries()]
    .filter(([, v]) => v.t >= 3)
    .map(([name, v]) => ({ name, pct: Math.round((v.c / v.t) * 100), t: v.t }))
    .sort((a, b) => a.pct - b.pct)
    .slice(0, 5);

  const minutes = stats.data!.goals.reduce((sum, g) => sum + (g.minutes_done ?? 0), 0);
  const activeDays = stats.data!.goals.filter((g) => (g.questions_done ?? 0) > 0).length;

  return (
    <>
      <PageHeader
        eyebrow="Progress"
        title="Numbers that actually change how you study."
        description="Every metric is computed from your own attempts."
      />

      {total === 0 ? (
        <EmptyState
          title="No data yet"
          description="Answer some practice questions and your analytics will appear here."
        />
      ) : (
        <>
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="Key metrics">
            <StatCard
              tone="primary"
              label="Accuracy"
              value={`${accuracy}%`}
              icon={<Percent className="size-4" aria-hidden />}
            />
            <StatCard
              tone="sky"
              label="Questions solved"
              value={total}
              icon={<Target className="size-4" aria-hidden />}
            />
            <StatCard
              label="Avg time / question"
              value={`${avgTime}s`}
              icon={<Clock className="size-4" aria-hidden />}
            />
            <StatCard
              tone="warning"
              label="Active days (14)"
              value={activeDays}
              hint={`${minutes} minutes studied`}
              icon={<Flame className="size-4" aria-hidden />}
            />
          </section>

          <ClayCard className="reveal mt-5" aria-labelledby="subjects">
            <h2 id="subjects" className="mb-4 font-display text-xl">
              Subject strength
            </h2>
            <ul className="space-y-3.5">
              {[...bySubject.entries()].map(([name, v]) => {
                const pct = Math.round((v.c / v.t) * 100);
                return (
                  <li key={name}>
                    <div className="flex items-center justify-between text-sm font-bold">
                      <span>{name}</span>
                      <span>{pct}%</span>
                    </div>
                    <ClayProgress
                      className="mt-1.5"
                      label={`${name} accuracy`}
                      value={pct}
                      barClassName={
                        pct >= 70 ? "bg-primary" : pct >= 50 ? "bg-warning" : "bg-coral"
                      }
                    />
                  </li>
                );
              })}
            </ul>
          </ClayCard>

          {weakTopics.length ? (
            <ClayCard tone="coral" className="reveal mt-4" aria-labelledby="weak">
              <h2 id="weak" className="mb-3 font-display text-xl">
                Weak topics to fix
              </h2>
              <ul className="space-y-2">
                {weakTopics.map((topic) => (
                  <li
                    key={topic.name}
                    className="clay-sm flex items-center justify-between gap-3 bg-card px-3.5 py-2.5 text-sm font-bold text-foreground"
                  >
                    <span className="min-w-0 truncate">{topic.name}</span>
                    <span className="shrink-0">{topic.pct}%</span>
                  </li>
                ))}
              </ul>
            </ClayCard>
          ) : null}

          <ClayCard tone="sky" className="reveal mt-4" aria-labelledby="days">
            <h2 id="days" className="mb-3 font-display text-xl">
              Last 14 days
            </h2>
            <ul className="space-y-2 text-sm">
              {stats.data!.goals.map((goal) => (
                <li
                  key={goal.goal_date}
                  className="clay-sm flex items-center justify-between gap-2 bg-card px-3.5 py-2.5 text-foreground"
                >
                  <span className="font-bold">
                    {new Date(goal.goal_date).toLocaleDateString(undefined, {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                  <span className="text-right text-xs font-semibold text-muted-foreground">
                    {goal.questions_done} questions · {goal.minutes_done} min
                    {goal.questions_done >= goal.question_goal ? " ✅" : ""}
                  </span>
                </li>
              ))}
            </ul>
          </ClayCard>
        </>
      )}
    </>
  );
}
