import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Clock, ListChecks, Timer } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/AppShell";
import { EmptyState, ErrorState, LoadingState } from "@/components/States";
import { ClayCard, Chip } from "@/components/kit";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/tests/")({
  head: () => ({
    meta: [
      { title: "Mock tests — RankUp AI" },
      {
        name: "description",
        content: "Timed SSC CGL mock tests with exam-accurate scoring and detailed result analysis.",
      },
      { property: "og:title", content: "Mock tests — RankUp AI" },
      { property: "og:description", content: "Timed mock tests with exam-accurate scoring." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TestsPage,
});

const CARD_TONES = ["primary", "sky", "coral", "warning"] as const;

function TestsPage() {
  const navigate = useNavigate();

  const tests = useQuery({
    queryKey: ["tests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tests")
        .select("id, title, description, test_type, duration_minutes, total_questions")
        .eq("is_published", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const attempts = useQuery({
    queryKey: ["test-attempts"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return [];
      const { data, error } = await supabase
        .from("test_attempts")
        .select("id, test_id, status, score, max_marks, accuracy, submitted_at, tests(title)")
        .eq("user_id", auth.user.id)
        .order("started_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
  });

  if (tests.isLoading) return <LoadingState label="Loading tests…" />;
  if (tests.isError) return <ErrorState onRetry={() => tests.refetch()} />;

  const inProgress = (attempts.data ?? []).filter((a) => a.status === "in_progress");
  const submitted = (attempts.data ?? []).filter((a) => a.status === "submitted");

  return (
    <>
      <PageHeader
        eyebrow="Mock tests"
        title="Practise the paper, not just the topic."
        description="Exam-accurate timing, palette navigation and negative-marking-aware scoring."
      />

      {inProgress.length ? (
        <section className="mb-5" aria-labelledby="resume">
          <h2 id="resume" className="mb-2 font-display text-lg">
            Continue where you left off
          </h2>
          {inProgress.map((attempt) => (
            <ClayCard
              key={attempt.id}
              tone="warning"
              className="mb-2 flex flex-wrap items-center justify-between gap-3 p-4"
            >
              <p className="min-w-0 font-display text-lg leading-tight">
                {(attempt as any).tests?.title}
              </p>
              <Button
                size="sm"
                onClick={() => navigate({ to: "/tests/$testId", params: { testId: attempt.test_id } })}
              >
                Continue test
              </Button>
            </ClayCard>
          ))}
        </section>
      ) : null}

      {!tests.data?.length ? (
        <EmptyState title="No tests published yet" description="Check back soon." />
      ) : (
        <section className="grid gap-4 sm:grid-cols-2" aria-label="Available tests">
          {tests.data.map((test, i) => (
            <ClayCard
              key={test.id}
              tone={CARD_TONES[i % CARD_TONES.length]!}
              interactive
              className="reveal flex flex-col"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-2xl border-2 border-border bg-card text-foreground">
                  <Timer className="size-5" aria-hidden />
                </span>
                <Chip className="capitalize">{test.test_type.replace("_", " ")}</Chip>
              </div>
              <h3 className="mt-3 font-display text-xl leading-tight">{test.title}</h3>
              {test.description ? (
                <p className="mt-1 text-sm opacity-80">{test.description}</p>
              ) : null}
              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="clay-sm bg-card px-3 py-2 text-center text-foreground">
                  <p className="text-[11px] font-bold uppercase text-muted-foreground">Questions</p>
                  <p className="font-display text-lg leading-none">{test.total_questions}</p>
                </div>
                <div className="clay-sm bg-card px-3 py-2 text-center text-foreground">
                  <p className="text-[11px] font-bold uppercase text-muted-foreground">Time</p>
                  <p className="font-display text-lg leading-none">{test.duration_minutes} min</p>
                </div>
              </div>
              <Button
                variant="secondary"
                className="mt-4 w-full cta-arrow"
                onClick={() => navigate({ to: "/tests/$testId", params: { testId: test.id } })}
              >
                Start test <ArrowRight className="size-4" aria-hidden />
              </Button>
            </ClayCard>
          ))}
        </section>
      )}

      {submitted.length ? (
        <section className="mt-6" aria-labelledby="history">
          <h2 id="history" className="mb-3 font-display text-lg">
            Past attempts
          </h2>
          <div className="grid gap-2.5">
            {submitted.map((attempt) => (
              <Link
                key={attempt.id}
                to="/results/$attemptId"
                params={{ attemptId: attempt.id }}
                className="surface tactile press flex items-center justify-between gap-3 p-4"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-extrabold">{(attempt as any).tests?.title}</p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="size-3.5" aria-hidden />
                    {attempt.submitted_at ? new Date(attempt.submitted_at).toLocaleDateString() : ""}
                  </p>
                </div>
                <span className="clay-sm shrink-0 bg-primary px-3 py-1.5 font-display text-base text-primary-foreground">
                  {Number(attempt.score)} / {Number(attempt.max_marks)}
                </span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <p className="mt-6 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
        <ListChecks className="size-3.5" aria-hidden /> Scores use exam-accurate negative marking.
      </p>
    </>
  );
}
