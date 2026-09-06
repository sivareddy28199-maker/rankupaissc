import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import {
  ArrowRight,
  BarChart3,
  Bookmark,
  BookOpenCheck,
  Bot,
  Brain,
  CalendarCheck,
  Flame,
  GraduationCap,
  Layers,
  NotebookPen,
  RefreshCcw,
  Sparkles,
  Target,
  Timer,
  Trophy,
} from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Chip, ClayCard, ClayProgress, ProgressRing, SectionHeader } from "@/components/kit";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "RankUp AI — Your smarter way to rank higher" },
      {
        name: "description",
        content:
          "AI-powered preparation, adaptive practice, timed mock tests and personalised guidance built for SSC CGL and CUET PG aspirants.",
      },
      { property: "og:title", content: "RankUp AI — Your smarter way to rank higher" },
      {
        property: "og:description",
        content:
          "Adaptive practice, timed mock tests, smart revision and an AI coach built for Indian competitive exams.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  { icon: Bot, title: "AI Coach", body: "A daily mission built from your real accuracy data.", tone: "primary" as const },
  { icon: Brain, title: "AI Doubt Solver", body: "Ask anything mid-practice and get an exam-style answer.", tone: "sky" as const },
  { icon: NotebookPen, title: "AI Notes Maker", body: "Crisp, revision-ready notes for any topic on demand.", tone: "coral" as const },
  { icon: BookOpenCheck, title: "Mock Tests", body: "Timed papers with palette, review flags and real scoring.", tone: "card" as const },
  { icon: RefreshCcw, title: "Smart Revision", body: "Spaced repetition queue so nothing slips away.", tone: "warning" as const },
  { icon: BarChart3, title: "Progress Analytics", body: "Accuracy trends, weak topics and pace per question.", tone: "sky" as const },
  { icon: CalendarCheck, title: "Study Plans", body: "Personalised schedules that adapt as you improve.", tone: "coral" as const },
  { icon: Target, title: "Question Practice", body: "Subject, topic and difficulty-wise sets with explanations.", tone: "primary" as const },
];

const TEST_CARDS = [
  { title: "Quick Practice", questions: "10", time: "10 min", marks: "20", difficulty: "Easy", tone: "primary" as const, icon: Target },
  { title: "Topic Test", questions: "20", time: "20 min", marks: "40", difficulty: "Medium", tone: "sky" as const, icon: Layers },
  { title: "Sectional Test", questions: "25", time: "25 min", marks: "50", difficulty: "Medium", tone: "coral" as const, icon: Timer },
  { title: "SSC CGL Full Mock", questions: "60", time: "60 min", marks: "120", difficulty: "Hard", tone: "card" as const, icon: Trophy },
];

const TESTIMONIALS = [
  { name: "Ananya R.", exam: "SSC CGL aspirant", quote: "The weak-topic list is brutally honest. My reasoning accuracy went from guesswork to a routine." },
  { name: "Vikram S.", exam: "CUET PG", quote: "Mock tests feel like the real paper — palette, timer, marks. No surprises on exam day." },
  { name: "Priya M.", exam: "SSC CGL aspirant", quote: "The AI coach gives me a 45-minute plan every morning. I finally stopped studying randomly." },
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
      {/* Sticky nav */}
      <div className="sticky top-0 z-40 px-3 pt-3">
        <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 rounded-2xl border-2 border-border bg-card/95 px-3 py-2.5 shadow-[4px_4px_0_0_var(--ink)] backdrop-blur">
          <div className="flex min-w-0 items-center gap-2">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl border-2 border-border bg-primary text-primary-foreground shadow-[2px_2px_0_0_var(--ink)]">
              <GraduationCap className="size-5" aria-hidden />
            </span>
            <span className="truncate font-display text-lg font-extrabold">RankUp AI</span>
          </div>
          <nav aria-label="Sections" className="hidden items-center gap-5 text-sm font-bold md:flex">
            <a href="#features" className="hover:text-primary">Features</a>
            <a href="#coach" className="hover:text-primary">AI Coach</a>
            <a href="#tests" className="hover:text-primary">Tests</a>
            <a href="#progress" className="hover:text-primary">Progress</a>
          </nav>
          <Button asChild size="sm">
            <Link to="/auth">Sign in</Link>
          </Button>
        </header>
      </div>

      <main className="mx-auto w-full max-w-6xl px-4 pb-16">
        {/* HERO */}
        <section className="grid items-center gap-8 py-8 lg:grid-cols-2 lg:py-14">
          <div className="reveal">
            <Chip tone="coral" className="mb-4">
              <Sparkles className="size-3.5" aria-hidden /> SSC CGL · CUET PG · more coming
            </Chip>
            <h1 className="font-display text-4xl leading-[1.05] sm:text-6xl">
              Your smarter way to{" "}
              <span className="inline-block rounded-xl border-2 border-border bg-primary px-2 text-primary-foreground shadow-[3px_3px_0_0_var(--ink)]">
                rank higher.
              </span>
            </h1>
            <p className="mt-5 max-w-xl text-base text-muted-foreground sm:text-lg">
              AI-powered preparation, adaptive practice, mock tests and personalised guidance built
              for competitive-exam students.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link to="/auth">
                  Start Learning Free <ArrowRight className="size-4" aria-hidden />
                </Link>
              </Button>
              <Button asChild size="lg" variant="secondary">
                <a href="#features">Explore RankUp</a>
              </Button>
            </div>
          </div>

          {/* Hero product preview */}
          <div className="relative mx-auto w-full max-w-md lg:max-w-none">
            <ClayCard className="clay-lg reveal p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                    Product preview
                  </p>
                  <h2 className="font-display text-2xl">Today's Mission</h2>
                </div>
                <Chip tone="warning">
                  <Flame className="size-3.5" aria-hidden /> 7 day streak
                </Chip>
              </div>

              <div className="mt-5 flex items-center gap-5">
                <ProgressRing value={72}>
                  <div>
                    <p className="font-display text-2xl leading-none">72%</p>
                    <p className="text-[10px] font-bold uppercase text-muted-foreground">accuracy</p>
                  </div>
                </ProgressRing>
                <div className="min-w-0 flex-1 space-y-3">
                  <div>
                    <p className="mb-1 text-xs font-bold">3 of 5 topics completed</p>
                    <ClayProgress value={60} label="Topics completed" />
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-bold">12 questions remaining</p>
                    <ClayProgress value={40} barClassName="bg-coral" label="Questions remaining" />
                  </div>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="clay-sm bg-sky p-3 text-sky-foreground">
                  <p className="text-xs font-bold uppercase opacity-70">Mock score</p>
                  <p className="font-display text-2xl">86%</p>
                </div>
                <div className="clay-sm bg-primary p-3 text-primary-foreground">
                  <p className="text-xs font-bold uppercase opacity-70">Due revision</p>
                  <p className="font-display text-2xl">8 cards</p>
                </div>
              </div>
            </ClayCard>

            <div className="pointer-events-none absolute -left-5 top-28 hidden animate-float-slow rounded-2xl border-2 border-border bg-coral px-3 py-2 text-xs font-extrabold text-coral-foreground shadow-[3px_3px_0_0_var(--ink)] sm:block">
              +12 XP
            </div>
            <div className="pointer-events-none absolute -right-5 bottom-6 hidden animate-float-mid items-center gap-1.5 rounded-2xl border-2 border-border bg-card px-3 py-2 text-xs font-extrabold shadow-[3px_3px_0_0_var(--ink)] sm:flex">
              <Bot className="size-4" aria-hidden /> AI Coach
            </div>
          </div>
        </section>

        {/* FEATURES */}
        <section id="features" className="scroll-mt-24 py-10">
          <SectionHeader
            eyebrow="Everything in one app"
            title="A full preparation system, not just a question bank."
            description="Each tool feeds the next — practice trains the analytics, analytics trains the AI coach."
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => (
              <ClayCard key={f.title} tone={f.tone} interactive className="p-4">
                <span className="grid size-11 place-items-center rounded-2xl border-2 border-border bg-card text-foreground shadow-[2px_2px_0_0_var(--ink)]">
                  <f.icon className="size-5" aria-hidden />
                </span>
                <h3 className="mt-3 font-display text-lg">{f.title}</h3>
                <p className="mt-1 text-sm opacity-80">{f.body}</p>
              </ClayCard>
            ))}
          </div>
        </section>

        {/* AI COACH */}
        <section id="coach" className="scroll-mt-24 py-10">
          <div className="clay-lg overflow-hidden bg-foreground p-6 text-background sm:p-10">
            <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr] lg:items-center">
              <div>
                <Chip tone="primary" className="mb-4">
                  <span className="size-2 animate-pulse rounded-full bg-current" aria-hidden />
                  AI online
                </Chip>
                <h2 className="font-display text-3xl leading-tight sm:text-5xl">Your AI Coach</h2>
                <p className="mt-3 max-w-lg text-sm opacity-80 sm:text-base">
                  RankUp AI reads your real attempts — accuracy, pace, weak topics — and turns them
                  into a plan you can finish today. Not another mock-test website.
                </p>
                <div className="mt-6">
                  <Button asChild size="lg">
                    <Link to="/auth">
                      Start Today's Plan <ArrowRight className="size-4" aria-hidden />
                    </Link>
                  </Button>
                </div>
              </div>

              <div className="clay bg-card p-5 text-card-foreground">
                <p className="font-display text-xl">Good morning 👋</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  You're strongest in Reasoning. Let's fix Quant today.
                </p>
                <ul className="mt-4 space-y-2.5">
                  {[
                    { label: "Percentages", time: "20 min", tone: "bg-primary text-primary-foreground" },
                    { label: "English Grammar", time: "15 min", tone: "bg-sky text-sky-foreground" },
                    { label: "Revision queue", time: "10 min", tone: "bg-coral text-coral-foreground" },
                  ].map((t) => (
                    <li
                      key={t.label}
                      className={`clay-sm flex items-center justify-between gap-3 px-3.5 py-2.5 text-sm font-bold ${t.tone}`}
                    >
                      <span className="truncate">{t.label}</span>
                      <span className="shrink-0 text-xs">{t.time}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* TESTS */}
        <section id="tests" className="scroll-mt-24 py-10">
          <SectionHeader
            eyebrow="Mock tests"
            title="Practise the paper, not just the topic."
            description="Exam-accurate timing, palette navigation, mark-for-review and negative-marking-aware scoring."
          />
          <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-3 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-4">
            {TEST_CARDS.map((t) => (
              <ClayCard
                key={t.title}
                tone={t.tone}
                interactive
                className="w-[78vw] shrink-0 snap-start sm:w-auto"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="grid size-10 place-items-center rounded-xl border-2 border-border bg-card text-foreground shadow-[2px_2px_0_0_var(--ink)]">
                    <t.icon className="size-5" aria-hidden />
                  </span>
                  <Chip>{t.difficulty}</Chip>
                </div>
                <h3 className="mt-3 font-display text-xl">{t.title}</h3>
                <dl className="mt-3 grid grid-cols-3 gap-2 text-center text-xs font-bold">
                  <div className="clay-sm bg-card px-1 py-2 text-foreground">
                    <dt className="opacity-60">Qs</dt>
                    <dd className="font-display text-base">{t.questions}</dd>
                  </div>
                  <div className="clay-sm bg-card px-1 py-2 text-foreground">
                    <dt className="opacity-60">Time</dt>
                    <dd className="font-display text-base">{t.time}</dd>
                  </div>
                  <div className="clay-sm bg-card px-1 py-2 text-foreground">
                    <dt className="opacity-60">Marks</dt>
                    <dd className="font-display text-base">{t.marks}</dd>
                  </div>
                </dl>
                <Button asChild variant="outline" className="mt-4 w-full">
                  <Link to="/auth">
                    Start Test <ArrowRight className="size-4" aria-hidden />
                  </Link>
                </Button>
              </ClayCard>
            ))}
          </div>
        </section>

        {/* PROGRESS */}
        <section id="progress" className="scroll-mt-24 py-10">
          <div className="clay-lg bg-sky p-6 text-sky-foreground sm:p-10">
            <SectionHeader
              eyebrow="Progress"
              title="Numbers that actually change how you study."
              description="Every metric below is computed from your own attempts once you sign in — this is a product preview."
            />
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="clay bg-card p-5 text-card-foreground">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { l: "Accuracy", v: "72%" },
                    { l: "Questions solved", v: "1,240" },
                    { l: "Tests completed", v: "18" },
                    { l: "Study streak", v: "7 days" },
                  ].map((s) => (
                    <div key={s.l} className="clay-sm bg-muted p-3">
                      <p className="text-xs font-bold uppercase opacity-60">{s.l}</p>
                      <p className="font-display text-2xl">{s.v}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="clay bg-card p-5 text-card-foreground">
                <p className="font-display text-lg">Subject strength</p>
                <div className="mt-4 space-y-3.5">
                  {[
                    { s: "Reasoning", v: 84 },
                    { s: "General Awareness", v: 68 },
                    { s: "Quantitative Aptitude", v: 54, weak: true },
                    { s: "English", v: 61 },
                  ].map((row) => (
                    <div key={row.s}>
                      <div className="mb-1 flex items-center justify-between gap-2 text-xs font-bold">
                        <span className="truncate">{row.s}</span>
                        <span className="shrink-0">{row.v}%</span>
                      </div>
                      <ClayProgress
                        value={row.v}
                        barClassName={row.weak ? "bg-coral" : "bg-primary"}
                        label={row.s}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* REVISION */}
        <section className="py-10">
          <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr] lg:items-center">
            <SectionHeader
              eyebrow="Smart revision"
              title="Never forget what you learn."
              description="Bookmarks and spaced repetition keep old topics alive while you move to new ones."
              className="mb-0"
            />
            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: RefreshCcw, l: "Due for revision", v: "8 items", tone: "primary" as const },
                { icon: Bookmark, l: "Bookmarked", v: "34 questions", tone: "sky" as const },
                { icon: Target, l: "Weak topics", v: "5 tracked", tone: "coral" as const },
                { icon: Flame, l: "Revision streak", v: "7 days", tone: "warning" as const },
              ].map((c) => (
                <ClayCard key={c.l} tone={c.tone} interactive className="p-4">
                  <c.icon className="size-5" aria-hidden />
                  <p className="mt-2 text-xs font-bold uppercase opacity-70">{c.l}</p>
                  <p className="font-display text-xl">{c.v}</p>
                </ClayCard>
              ))}
            </div>
          </div>
        </section>

        {/* TESTIMONIALS */}
        <section className="py-10">
          <SectionHeader eyebrow="Students" title="Built with aspirants, for aspirants." />
          <div className="grid gap-4 md:grid-cols-3">
            {TESTIMONIALS.map((t, i) => (
              <ClayCard
                key={t.name}
                tone={i === 1 ? "coral" : "card"}
                interactive
                className="flex flex-col justify-between"
              >
                <p className="text-sm leading-relaxed">“{t.quote}”</p>
                <div className="mt-4 flex items-center gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-full border-2 border-border bg-primary font-display text-base text-primary-foreground">
                    {t.name.slice(0, 1)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-extrabold">{t.name}</p>
                    <p className="truncate text-xs opacity-70">{t.exam}</p>
                  </div>
                </div>
              </ClayCard>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="py-10">
          <div className="clay-lg bg-primary p-8 text-center text-primary-foreground sm:p-14">
            <h2 className="font-display text-3xl sm:text-5xl">Ready to Rank Up?</h2>
            <p className="mx-auto mt-3 max-w-xl text-sm opacity-80 sm:text-base">
              Build your preparation system. Practice smarter. Track your progress. Improve every
              day.
            </p>
            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              <Button asChild size="lg" variant="outline">
                <Link to="/auth">
                  Start Learning Free <ArrowRight className="size-4" aria-hidden />
                </Link>
              </Button>
              <Button asChild size="lg" variant="secondary">
                <a href="#features">Explore Features</a>
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="border-t-2 border-border bg-card">
        <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="grid size-9 place-items-center rounded-xl border-2 border-border bg-primary text-primary-foreground shadow-[2px_2px_0_0_var(--ink)]">
                <GraduationCap className="size-5" aria-hidden />
              </span>
              <span className="font-display text-lg font-extrabold">RankUp AI</span>
            </div>
            <p className="mt-3 max-w-xs text-sm text-muted-foreground">
              An AI study system for competitive-exam students — practice, mock tests, revision and
              coaching in one app.
            </p>
          </div>
          <FooterCol
            title="Product"
            items={["AI Coach", "Mock Tests", "Practice", "Revision", "Progress"]}
          />
          <FooterCol title="Resources" items={["SSC CGL", "CUET PG", "Study Resources"]} />
          <FooterCol title="Company" items={["About", "Contact", "Privacy", "Terms"]} />
        </div>
        <div className="border-t-2 border-border px-4 py-4 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} RankUp AI. Built for aspirants.
        </div>
      </footer>
    </div>
  );
}

function FooterCol({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="font-display text-base">{title}</p>
      <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
        {items.map((i) => (
          <li key={i}>
            <Link to="/auth" className="hover:text-foreground">
              {i}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
