import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BookOpenCheck, Bot, Flame, RefreshCcw, Target } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { PageHeader } from "@/components/AppShell";
import { ErrorState, LoadingState } from "@/components/States";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Your dashboard — RankUp AI" },
      { name: "description", content: "Today's mission, streak and performance summary." },
      { property: "og:title", content: "Your dashboard — RankUp AI" },
      { property: "og:description", content: "Today's mission, streak and performance summary." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

async function loadStats() {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) throw new Error("Not signed in");
  const today = new Date().toISOString().slice(0, 10);

  const [goal, answers, attempts, minutes] = await Promise.all([
    supabase.from("daily_goals").select("*").eq("user_id", userId).eq("goal_date", today).maybeSingle(),
    supabase.from("practice_answers").select("is_correct").eq("user_id", userId),
    supabase
      .from("test_attempts")
      .select("score, max_marks, accuracy, status")
      .eq("user_id", userId)
      .eq("status", "submitted"),
    supabase.from("study_sessions").select("minutes").eq("user_id", userId),
  ]);

  const rows = answers.data ?? [];
  const submitted = attempts.data ?? [];
  const avgScore = submitted.length
    ? Math.round(
        submitted.reduce(
          (s, a) => s + (Number(a.max_marks) > 0 ? (Number(a.score) / Number(a.max_marks)) * 100 : 0),
          0,
        ) / submitted.length,
      )
    : 0;

  return {
    goal: goal.data,
    questionsAttempted: rows.length,
    accuracy: rows.length ? Math.round((rows.filter((r) => r.is_correct).length / rows.length) * 100) : 0,
    testsCompleted: submitted.length,
    averageScore: avgScore,
    totalMinutes: (minutes.data ?? []).reduce((s, m) => s + (m.minutes ?? 0), 0),
  };
}

const QUICK_ACTIONS = [
  { to: "/practice", label: "Start practice", icon: Target },
  { to: "/tests", label: "Take mock test", icon: BookOpenCheck },
  { to: "/coach", label: "Ask AI", icon: Bot },
  { to: "/revision", label: "Revise", icon: RefreshCcw },
] as const;

function Dashboard() {
  const { data: profile, isLoading: profileLoading } = useProfile();
  const stats = useQuery({ queryKey: ["dashboard-stats"], queryFn: loadStats });

  if (profileLoading || stats.isLoading) return <LoadingState label="Loading your dashboard…" />;
  if (stats.isError) return <ErrorState onRetry={() => stats.refetch()} />;

  const questionGoal = profile?.daily_question_goal ?? 30;
  const done = stats.data?.goal?.questions_done ?? 0;
  const remaining = Math.max(0, questionGoal - done);
  const minutesGoal = profile?.daily_minutes_goal ?? 90;
  const minutesDone = stats.data?.goal?.minutes_done ?? 0;

  return (
    <>
      <PageHeader
        title={`${greeting()}, ${profile?.full_name?.split(" ")[0] ?? "student"}.`}
        description={`Target: ${profile?.target_exam_code ?? "SSC-CGL"} ${profile?.target_year ?? ""}`}
      />

      <section className="surface p-4 sm:p-5" aria-labelledby="mission">
        <div className="flex items-center justify-between">
          <h2 id="mission" className="font-display text-base font-semibold">
            Today&apos;s mission
          </h2>
          <span className="flex items-center gap-1.5 rounded-full bg-warning/15 px-2.5 py-1 text-xs font-semibold text-warning-foreground">
            <Flame className="size-3.5 text-warning" aria-hidden />
            {profile?.current_streak ?? 0} day streak
          </span>
        </div>

        <div className="mt-4 space-y-4">
          <div>
            <div className="mb-1.5 flex justify-between text-sm">
              <span className="text-muted-foreground">Questions</span>
              <span className="font-medium">
                {done} / {questionGoal}
              </span>
            </div>
            <Progress value={Math.min(100, (done / Math.max(1, questionGoal)) * 100)} />
            <p className="mt-1.5 text-xs text-muted-foreground">
              {remaining > 0 ? `${remaining} questions left today` : "Daily target complete."}
            </p>
          </div>
          <div>
            <div className="mb-1.5 flex justify-between text-sm">
              <span className="text-muted-foreground">Study time</span>
              <span className="font-medium">
                {minutesDone} / {minutesGoal} min
              </span>
            </div>
            <Progress value={Math.min(100, (minutesDone / Math.max(1, minutesGoal)) * 100)} />
          </div>
        </div>
      </section>

      <section className="mt-4 grid grid-cols-2 gap-3" aria-label="Quick actions">
        {QUICK_ACTIONS.map((action) => (
          <Button key={action.to} asChild variant="outline" className="h-auto justify-start gap-3 py-3.5">
            <Link to={action.to}>
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                <action.icon className="size-4" aria-hidden />
              </span>
              <span className="text-sm font-medium">{action.label}</span>
            </Link>
          </Button>
        ))}
      </section>

      <section className="mt-4" aria-labelledby="performance">
        <h2 id="performance" className="mb-3 font-display text-base font-semibold">
          Performance summary
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Stat label="Accuracy" value={`${stats.data?.accuracy ?? 0}%`} />
          <Stat label="Questions attempted" value={stats.data?.questionsAttempted ?? 0} />
          <Stat label="Tests completed" value={stats.data?.testsCompleted ?? 0} />
          <Stat label="Average test score" value={`${stats.data?.averageScore ?? 0}%`} />
          <Stat label="Current streak" value={`${profile?.current_streak ?? 0} d`} />
          <Stat label="Study time" value={`${Math.round((stats.data?.totalMinutes ?? 0) / 60)} h`} />
        </div>
      </section>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="surface p-3.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-xl font-semibold">{value}</p>
    </div>
  );
}
