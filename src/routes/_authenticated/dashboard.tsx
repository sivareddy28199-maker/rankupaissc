import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  Bot,
  Clock,
  Flame,
  RefreshCcw,
  Target,
  Trophy,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useProfile";
import { PageHeader } from "@/components/AppShell";
import { ErrorState, LoadingState } from "@/components/States";
import { ClayCard, ClayProgress, StatCard } from "@/components/kit";
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
  { to: "/practice", label: "Start practice", icon: Target, tone: "primary" as const },
  { to: "/tests", label: "Mock test", icon: BookOpenCheck, tone: "sky" as const },
  { to: "/revision", label: "Revise", icon: RefreshCcw, tone: "coral" as const },
  { to: "/progress", label: "Progress", icon: BarChart3, tone: "warning" as const },
];

const TONE_CLASS: Record<string, string> = {
  primary: "bg-primary text-primary-foreground",
  sky: "bg-sky text-sky-foreground",
  coral: "bg-coral text-coral-foreground",
  warning: "bg-warning text-warning-foreground",
};

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
        eyebrow="Today"
        title={`${greeting()}, ${profile?.full_name?.split(" ")[0] ?? "student"}.`}
        description={`Target: ${profile?.target_exam_code ?? "SSC-CGL"} ${profile?.target_year ?? ""}`}
      />

      {/* Today's mission — green, primary */}
      <ClayCard tone="primary" className="reveal" aria-labelledby="mission">
        <div className="flex items-start justify-between gap-3">
          <h2 id="mission" className="font-display text-2xl leading-tight">
            Today&apos;s mission
          </h2>
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border-2 border-border bg-warning px-3 py-1 text-xs font-extrabold text-warning-foreground">
            <Flame className="size-3.5" aria-hidden />
            {profile?.current_streak ?? 0} day streak
          </span>
        </div>

        <div className="mt-4 space-y-4">
          <div>
            <div className="mb-1.5 flex justify-between text-sm font-bold">
              <span>Questions</span>
              <span>
                {done} / {questionGoal}
              </span>
            </div>
            <ClayProgress
              label="Question goal"
              value={(done / Math.max(1, questionGoal)) * 100}
              className="bg-card"
              barClassName="bg-foreground"
            />
            <p className="mt-1.5 text-xs font-semibold opacity-80">
              {remaining > 0 ? `${remaining} questions left today` : "Daily target complete."}
            </p>
          </div>
          <div>
            <div className="mb-1.5 flex justify-between text-sm font-bold">
              <span>Study time</span>
              <span>
                {minutesDone} / {minutesGoal} min
              </span>
            </div>
            <ClayProgress
              label="Study time goal"
              value={(minutesDone / Math.max(1, minutesGoal)) * 100}
              className="bg-card"
              barClassName="bg-foreground"
            />
          </div>
          <Button asChild variant="secondary" className="w-full cta-arrow">
            <Link to="/practice">
              Continue practice <ArrowRight className="size-4" aria-hidden />
            </Link>
          </Button>
        </div>
      </ClayCard>

      {/* AI Coach — navy */}
      <ClayCard tone="ink" className="reveal mt-4">
        <span className="inline-flex items-center gap-2 rounded-full border-2 border-border bg-primary px-3 py-1 text-xs font-extrabold text-primary-foreground">
          <span className="size-2 rounded-full bg-foreground" aria-hidden />
          AI online
        </span>
        <h2 className="mt-3 font-display text-2xl leading-tight">Your AI Coach</h2>
        <p className="mt-1 text-sm opacity-80">
          Ask a doubt, generate notes, or get a plan built from your own attempts.
        </p>
        <Button asChild className="mt-4 cta-arrow">
          <Link to="/coach">
            Open AI Coach <ArrowRight className="size-4" aria-hidden />
          </Link>
        </Button>
      </ClayCard>

      <section className="mt-4 grid grid-cols-2 gap-3" aria-label="Quick actions">
        {QUICK_ACTIONS.map((action) => (
          <Link
            key={action.to}
            to={action.to}
            className={`clay tactile press flex min-h-16 items-center gap-3 px-4 py-3.5 ${TONE_CLASS[action.tone]}`}
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-xl border-2 border-border bg-card text-foreground">
              <action.icon className="size-4.5" aria-hidden />
            </span>
            <span className="text-sm font-extrabold">{action.label}</span>
          </Link>
        ))}
      </section>

      <section className="mt-6" aria-labelledby="performance">
        <h2 id="performance" className="mb-3 font-display text-xl">
          Performance summary
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatCard tone="sky" label="Accuracy" value={`${stats.data?.accuracy ?? 0}%`} icon={<Target className="size-4" aria-hidden />} />
          <StatCard label="Questions solved" value={stats.data?.questionsAttempted ?? 0} />
          <StatCard label="Tests completed" value={stats.data?.testsCompleted ?? 0} icon={<BookOpenCheck className="size-4" aria-hidden />} />
          <StatCard tone="coral" label="Avg test score" value={`${stats.data?.averageScore ?? 0}%`} icon={<Trophy className="size-4" aria-hidden />} />
          <StatCard tone="warning" label="Current streak" value={`${profile?.current_streak ?? 0} d`} icon={<Flame className="size-4" aria-hidden />} />
          <StatCard label="Study time" value={`${Math.round((stats.data?.totalMinutes ?? 0) / 60)} h`} icon={<Clock className="size-4" aria-hidden />} />
        </div>
      </section>

      <ClayCard tone="sky" className="reveal mt-4">
        <div className="flex items-center gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl border-2 border-border bg-card text-foreground">
            <Bot className="size-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="font-display text-lg leading-tight">Weak areas need attention</p>
            <p className="text-sm opacity-80">
              Open Progress to see which topics are dragging your accuracy down.
            </p>
          </div>
        </div>
        <Button asChild variant="outline" className="mt-4 w-full">
          <Link to="/progress">View analytics</Link>
        </Button>
      </ClayCard>
    </>
  );
}
