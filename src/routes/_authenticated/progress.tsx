import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/AppShell";
import { EmptyState, ErrorState, LoadingState } from "@/components/States";

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
  for (const answer of answers) {
    const name = answer.questions?.subjects?.name ?? "Other";
    const acc = bySubject.get(name) ?? { c: 0, t: 0 };
    acc.t += 1;
    if (answer.is_correct) acc.c += 1;
    bySubject.set(name, acc);
  }

  const minutes = stats.data!.goals.reduce((sum, g) => sum + (g.minutes_done ?? 0), 0);

  return (
    <>
      <PageHeader title="Progress" description="Where you stand and what to fix next." />

      {total === 0 ? (
        <EmptyState
          title="No data yet"
          description="Answer some practice questions and your analytics will appear here."
        />
      ) : (
        <>
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="Key metrics">
            <Stat label="Questions solved" value={total} />
            <Stat label="Overall accuracy" value={`${accuracy}%`} />
            <Stat label="Avg time / question" value={`${avgTime}s`} />
            <Stat label="Minutes (14 days)" value={minutes} />
          </section>

          <section className="surface mt-5 p-4" aria-labelledby="subjects">
            <h2 id="subjects" className="mb-3 text-sm font-semibold">
              Subject strength
            </h2>
            <ul className="space-y-3">
              {[...bySubject.entries()].map(([name, v]) => {
                const pct = Math.round((v.c / v.t) * 100);
                return (
                  <li key={name}>
                    <div className="flex items-center justify-between text-sm">
                      <span>{name}</span>
                      <span className="font-medium">{pct}%</span>
                    </div>
                    <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary transition-[width]"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="surface mt-5 p-4" aria-labelledby="days">
            <h2 id="days" className="mb-3 text-sm font-semibold">
              Last 14 days
            </h2>
            <ul className="space-y-2 text-sm">
              {stats.data!.goals.map((goal) => (
                <li key={goal.goal_date} className="flex items-center justify-between">
                  <span className="text-muted-foreground">
                    {new Date(goal.goal_date).toLocaleDateString(undefined, {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                  <span>
                    {goal.questions_done} questions · {goal.minutes_done} min
                    {goal.questions_done >= goal.question_goal ? " ✅" : ""}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="surface p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold">{value}</p>
    </div>
  );
}
