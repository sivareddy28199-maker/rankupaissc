import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { BarChart3, Bot, BookOpenCheck, GraduationCap, RefreshCcw, Target } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "RankUp AI — AI study coach for SSC CGL & CUET" },
      {
        name: "description",
        content:
          "Practise real exam questions, take timed mock tests, revise weak topics and get a personalised AI study plan for SSC CGL and CUET PG.",
      },
      { property: "og:title", content: "RankUp AI — AI study coach for competitive exams" },
      {
        property: "og:description",
        content:
          "Adaptive practice, timed mock tests, progress analytics and an AI coach built for Indian competitive exams.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  { icon: Target, title: "Focused practice", body: "Subject, topic and difficulty-wise question sets with instant explanations." },
  { icon: BookOpenCheck, title: "Real mock tests", body: "Timed papers, question palette, mark-for-review and exam-accurate scoring." },
  { icon: BarChart3, title: "Honest analytics", body: "Accuracy trends, weak topics and time management from your own attempts." },
  { icon: RefreshCcw, title: "Smart revision", body: "Bookmarks and a spaced-repetition queue so nothing slips away." },
  { icon: Bot, title: "AI coach", body: "Daily missions, doubt solving, notes and question generation, personalised." },
  { icon: GraduationCap, title: "Built to scale", body: "SSC CGL today, more exams added without changing how you study." },
];

function Landing() {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-4">
        <div className="flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground">
            <GraduationCap className="size-5" aria-hidden />
          </span>
          <span className="font-display text-lg font-semibold">RankUp AI</span>
        </div>
        <Button asChild size="sm">
          <Link to="/auth">Sign in</Link>
        </Button>
      </header>

      <main className="mx-auto w-full max-w-5xl px-4 pb-16">
        <section className="py-10 sm:py-16">
          <p className="text-sm font-medium text-accent">SSC CGL · CUET PG · more coming</p>
          <h1 className="mt-3 max-w-2xl font-display text-3xl font-semibold leading-tight sm:text-5xl">
            Study less randomly. Rank up with an AI coach that knows your weak spots.
          </h1>
          <p className="mt-4 max-w-xl text-base text-muted-foreground">
            RankUp AI turns every practice question and mock test you attempt into a personalised
            plan — real data, real scoring, no guesswork.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/auth">Start free</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/auth">I already have an account</Link>
            </Button>
          </div>
        </section>

        <section aria-labelledby="features" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <h2 id="features" className="sr-only">
            What RankUp AI gives you
          </h2>
          {FEATURES.map((f) => (
            <article key={f.title} className="surface p-5">
              <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
                <f.icon className="size-5" aria-hidden />
              </span>
              <h3 className="mt-3 text-base font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}
