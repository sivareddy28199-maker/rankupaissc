import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, Clock, Flame, Percent, Target, TrendingUp, TrendingDown, BookOpenCheck } from "lucide-react";

import { progressQuery } from "@/lib/queries";
import { PageHeader } from "@/components/AppShell";
import { EmptyState, ErrorState, LoadingState } from "@/components/States";
import { ClayCard, ClayProgress, StatCard, ProgressRing } from "@/components/kit";
import { SSC_SUBJECTS } from "@/lib/ssc";

export const Route = createFileRoute("/_authenticated/progress")({
  head: () => ({
    meta: [
      { title: "Progress — RankUp AI" },
      { name: "description", content: "SSC CGL preparation progress, accuracy and subject analytics." },
      { property: "og:title", content: "Progress — RankUp AI" },
      { property: "og:description", content: "SSC CGL accuracy, subject analytics and performance trends." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProgressPage,
});

function ProgressPage() {
  const stats = useQuery(progressQuery);

  if (stats.isLoading) return <LoadingState label="Crunching your numbers…" />;
  if (stats.isError) return <ErrorState onRetry={() => stats.refetch()} />;

  const answers = stats.data!.answers as any[];
  const total = answers.length;
  const correct = answers.filter((a) => a.is_correct).length;
  const accuracy = total ? Math.round((correct / total) * 1000) / 10 : 0;

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

  const subjectAccuracy = [...bySubject.entries()].map(([name, v]) => ({
    name,
    pct: Math.round((v.c / Math.max(1, v.t)) * 100),
    t: v.t,
  }));

  const weakTopics = [...byTopic.entries()]
    .filter(([, v]) => v.t >= 3)
    .map(([name, v]) => ({ name, pct: Math.round((v.c / Math.max(1, v.t)) * 100), t: v.t }))
    .sort((a, b) => a.pct - b.pct)
    .slice(0, 5);

  const strongTopics = [...byTopic.entries()]
    .filter(([, v]) => v.t >= 3)
    .map(([name, v]) => ({ name, pct: Math.round((v.c / Math.max(1, v.t)) * 100), t: v.t }))
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 3);

  const minutes = stats.data!.goals.reduce((sum, g) => sum + (g.minutes_done ?? 0), 0);
  const activeDays = stats.data!.goals.filter((g) => (g.questions_done ?? 0) > 0).length;
  const avgTime = total
    ? Math.round(answers.reduce((sum, a) => sum + (a.time_taken_seconds ?? 0), 0) / total)
    : 0;
  const testsCompleted = stats.data!.testsCompleted ?? 0;
  const streak = stats.data!.currentStreak ?? 0;

  return (
    <>
      <PageHeader eyebrow="Progress" title="Your SSC CGL numbers." description="Every metric is computed from your own attempts." />

      {total === 0 ? (
        <EmptyState title="No data yet" description="Answer some practice questions and your analytics will appear here." />
      ) : (
        <>
          {/* Overall progress ring + quick stats */}
          <section className="grid gap-4 md:grid-cols-3" aria-label="Overall progress">
            <ClayCard tone="primary" className="reveal md:col-span-1">
              <div className="flex flex-col items-center gap-3 py-4">
                <ProgressRing value={accuracy} size={120}>
                  <span className="font-display text-3xl font-extrabold">{accuracy}%</span>
                  <span className="text-[10px] font-extrabold uppercase tracking-wide opacity-70">Accuracy</span>
                </ProgressRing>
                <div className="text-center">
                  <p className="font-display text-xl font-extrabold">SSC CGL Readiness</p>
                  <p className="text-xs text-muted-foreground">Based on {total} answered questions</p>
                </div>
              </div>
            </ClayCard>

            <ClayCard tone="sky" className="reveal md:col-span-2">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <StatCard tone="primary" label="Accuracy" value={`${accuracy}%`} icon={<Percent className="size-4" />} />
                <StatCard tone="sky" label="Questions solved" value={total} icon={<Target className="size-4" />} />
                <StatCard label="Avg time / q" value={`${avgTime}s`} icon={<Clock className="size-4" />} />
                <StatCard tone="warning" label="Active days" value={activeDays} hint={`${minutes} min studied`} icon={<Flame className="size-4" />} />
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs font-bold">
                <div className="clay-sm bg-card px-2 py-2">
                  <p className="text-[10px] uppercase tracking-wide opacity-60">Tests</p>
                  <p className="font-display text-xl">{testsCompleted}</p>
                </div>
                <div className="clay-sm bg-card px-2 py-2">
                  <p className="text-[10px] uppercase tracking-wide opacity-60">Streak</p>
                  <p className="font-display text-xl">{streak} d</p>
                </div>
                <div className="clay-sm bg-card px-2 py-2">
                  <p className="text-[10px] uppercase tracking-wide opacity-60">Correct</p>
                  <p className="font-display text-xl">{correct}</p>
                </div>
              </div>
            </ClayCard>
          </section>

          {/* Subject cards */}
          <section className="reveal mt-4" aria-label="Subject accuracy">
            <div className="mb-3 flex items-center gap-2">
              <h2 className="font-display text-xl">Subject strength</h2>
              <span className="rounded-full border-2 border-border bg-coral px-2.5 py-0.5 text-[10px] font-extrabold text-coral-foreground">SSC CGL</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {SSC_SUBJECTS.map((subject) => {
                const data = subjectAccuracy.find((s) => s.name === subject);
                const pct = data?.pct ?? 0;
                return (
                  <ClayCard key={subject} tone={pct >= 70 ? "primary" : pct >= 50 ? "sky" : "coral"} className="reveal">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="font-display text-base font-extrabold leading-tight">{subject}</h3>
                      <span className="text-xs font-extrabold">{data?.t ?? 0} q</span>
                    </div>
                    <div className="mt-2 flex items-end gap-2">
                      <span className="font-display text-3xl font-extrabold">{pct}%</span>
                      <span className="text-[10px] font-bold uppercase tracking-wide opacity-60">Accuracy</span>
                    </div>
                    <ClayProgress
                      className="mt-3"
                      value={pct}
                      barClassName={pct >= 70 ? "bg-primary" : pct >= 50 ? "bg-sky" : "bg-coral"}
                    />
                  </ClayCard>
                );
              })}
            </div>
          </section>

          {/* Weak / Strong topics */}
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {weakTopics.length ? (
              <ClayCard tone="coral" className="reveal" aria-label="Weak topics">
                <h2 className="mb-3 font-display text-xl">Weak topics to fix</h2>
                <ul className="space-y-2">
                  {weakTopics.map((topic) => (
                    <li key={topic.name} className="clay-sm flex items-center justify-between gap-3 bg-card px-3.5 py-2.5 text-sm font-bold text-foreground">
                      <span className="min-w-0 truncate">{topic.name}</span>
                      <span className="flex items-center gap-1 shrink-0 text-coral-foreground">
                        <TrendingDown className="size-3.5" aria-hidden />
                        {topic.pct}%
                      </span>
                    </li>
                  ))}
                </ul>
              </ClayCard>
            ) : null}

            {strongTopics.length ? (
              <ClayCard tone="primary" className="reveal" aria-label="Strong topics">
                <h2 className="mb-3 font-display text-xl">Strong topics</h2>
                <ul className="space-y-2">
                  {strongTopics.map((topic) => (
                    <li key={topic.name} className="clay-sm flex items-center justify-between gap-3 bg-card px-3.5 py-2.5 text-sm font-bold text-foreground">
                      <span className="min-w-0 truncate">{topic.name}</span>
                      <span className="flex items-center gap-1 shrink-0 text-primary">
                        <TrendingUp className="size-3.5" aria-hidden />
                        {topic.pct}%
                      </span>
                    </li>
                  ))}
                </ul>
              </ClayCard>
            ) : null}
          </div>

          {/* Activity / recent trend */}
          <ClayCard tone="sky" className="reveal mt-4" aria-label="Recent activity">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-xl">Study activity</h2>
                <p className="text-sm opacity-80">Last 14 days · {activeDays} active</p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-border bg-primary px-3 py-1 text-xs font-extrabold text-primary-foreground">
                <BookOpenCheck className="size-3.5" aria-hidden />
                {testsCompleted} tests
              </span>
            </div>
            <ul className="mt-4 space-y-2">
              {stats.data!.goals.slice(0, 7).map((goal) => {
                const date = new Date(goal.goal_date);
                const completed = (goal.questions_done ?? 0) >= (goal.question_goal ?? 0);
                return (
                  <li key={goal.goal_date} className="clay-sm flex items-center justify-between gap-2 bg-card px-3.5 py-2.5 text-sm font-bold text-foreground">
                    <span className="font-bold">
                      {date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {goal.questions_done} / {goal.question_goal} questions · {goal.minutes_done} min
                      {completed ? " ✅" : ""}
                    </span>
                  </li>
                );
              })}
            </ul>
          </ClayCard>
        </>
      )}
    </>
  );
}
