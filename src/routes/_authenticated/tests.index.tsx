import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Clock, ListChecks } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/AppShell";
import { EmptyState, ErrorState, LoadingState } from "@/components/States";
import { Badge } from "@/components/ui/badge";
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
      <PageHeader title="Mock tests" description="Timed papers with real exam scoring." />

      {inProgress.length ? (
        <section className="mb-5" aria-labelledby="resume">
          <h2 id="resume" className="mb-2 text-sm font-semibold text-muted-foreground">
            Continue where you left off
          </h2>
          {inProgress.map((attempt) => (
            <div key={attempt.id} className="surface mb-2 flex items-center justify-between gap-3 p-4">
              <p className="text-sm font-medium">{(attempt as any).tests?.title}</p>
              <Button
                size="sm"
                onClick={() => navigate({ to: "/tests/$testId", params: { testId: attempt.test_id } })}
              >
                Continue test
              </Button>
            </div>
          ))}
        </section>
      ) : null}

      {!tests.data?.length ? (
        <EmptyState title="No tests published yet" description="Check back soon." />
      ) : (
        <section className="grid gap-3" aria-label="Available tests">
          {tests.data.map((test) => (
            <article key={test.id} className="surface p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="capitalize">
                  {test.test_type.replace("_", " ")}
                </Badge>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="size-3.5" aria-hidden /> {test.duration_minutes} min
                </span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <ListChecks className="size-3.5" aria-hidden /> {test.total_questions} questions
                </span>
              </div>
              <h3 className="mt-2 text-base font-semibold">{test.title}</h3>
              {test.description ? (
                <p className="mt-1 text-sm text-muted-foreground">{test.description}</p>
              ) : null}
              <Button
                className="mt-3"
                size="sm"
                onClick={() => navigate({ to: "/tests/$testId", params: { testId: test.id } })}
              >
                Start test
              </Button>
            </article>
          ))}
        </section>
      )}

      {submitted.length ? (
        <section className="mt-6" aria-labelledby="history">
          <h2 id="history" className="mb-2 text-sm font-semibold text-muted-foreground">
            Past attempts
          </h2>
          <div className="grid gap-2">
            {submitted.map((attempt) => (
              <Link
                key={attempt.id}
                to="/results/$attemptId"
                params={{ attemptId: attempt.id }}
                className="surface flex items-center justify-between p-3.5 transition-colors hover:border-primary/40"
              >
                <div>
                  <p className="text-sm font-medium">{(attempt as any).tests?.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {attempt.submitted_at ? new Date(attempt.submitted_at).toLocaleDateString() : ""}
                  </p>
                </div>
                <span className="text-sm font-semibold">
                  {Number(attempt.score)} / {Number(attempt.max_marks)}
                </span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}
