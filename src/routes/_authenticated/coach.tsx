import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Send, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import {
  generateDailyPlan,
  generateNotes,
  generateQuestions,
  generateStudyPlan,
  getAiStatus,
  solveDoubt,
} from "@/lib/ai.functions";
import { ClayCard } from "@/components/kit";
import { Markdown } from "@/components/Markdown";
import { EmptyState, LoadingState } from "@/components/States";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DIFFICULTIES } from "@/lib/config";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/coach")({
  head: () => ({
    meta: [
      { title: "AI coach — RankUp AI" },
      {
        name: "description",
        content: "Ask doubts, generate revision notes, practice questions and a personalised study plan.",
      },
      { property: "og:title", content: "AI coach — RankUp AI" },
      { property: "og:description", content: "Doubt solver, notes maker and study planner in one place." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CoachPage,
});

function CoachPage() {
  const status = useQuery({ queryKey: ["ai-status"], queryFn: () => getAiStatus() });

  return (
    <>
      <ClayCard tone="ink" className="reveal mb-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2 rounded-full border-2 border-border bg-primary px-3 py-1 text-xs font-extrabold text-primary-foreground">
            <span className="size-2 rounded-full bg-foreground" aria-hidden />
            AI online
          </span>
          {status.data ? (
            <span className="rounded-full border-2 border-border bg-warning px-3 py-1 text-xs font-extrabold text-warning-foreground">
              {status.data.used}/{status.data.limit} today
            </span>
          ) : null}
        </div>
        <h1 className="mt-3 font-display text-3xl leading-tight">Your AI Coach</h1>
        <p className="mt-1 text-sm opacity-80">
          RankUp AI reads your real attempts — accuracy, pace, weak topics — and turns them into a
          plan you can finish today.
        </p>
      </ClayCard>

      <Tabs defaultValue="tutor">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="tutor">Tutor</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="questions">Questions</TabsTrigger>
          <TabsTrigger value="plan">Plan</TabsTrigger>
        </TabsList>

        <TabsContent value="tutor" className="mt-4">
          <TutorTab />
        </TabsContent>
        <TabsContent value="notes" className="mt-4">
          <NotesTab />
        </TabsContent>
        <TabsContent value="questions" className="mt-4">
          <QuestionsTab />
        </TabsContent>
        <TabsContent value="plan" className="mt-4">
          <PlanTab />
        </TabsContent>
      </Tabs>
    </>
  );
}

function TutorTab() {
  const ask = useServerFn(solveDoubt);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([]);

  const send = useMutation({
    mutationFn: async (message: string) => ask({ data: { conversationId, message } }),
    onSuccess: (res) => {
      setConversationId(res.conversationId);
      setMessages((m) => [...m, { role: "assistant", content: res.reply }]);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const message = input.trim();
    if (message.length < 2 || send.isPending) return;
    setMessages((m) => [...m, { role: "user", content: message }]);
    setInput("");
    send.mutate(message);
  }

  return (
    <section aria-label="Doubt solver">
      <div className="space-y-3">
        {messages.length === 0 ? (
          <EmptyState
            title="Ask any doubt"
            description="Explain a concept, solve a sum, or ask for a shortcut trick."
          />
        ) : null}
        {messages.map((message, i) => (
          <div
            key={i}
            className={cn(
              "reveal max-w-[92%] px-4 py-3 text-sm",
              message.role === "user"
                ? "clay-sm ml-auto bg-primary font-semibold text-primary-foreground"
                : "surface mr-auto",
            )}
          >
            {message.role === "assistant" ? (
              <Markdown content={message.content} />
            ) : (
              <p className="whitespace-pre-wrap">{message.content}</p>
            )}
          </div>
        ))}
        {send.isPending ? <LoadingState label="Thinking…" /> : null}
      </div>

      <form onSubmit={submit} className="sticky bottom-20 mt-4 flex gap-2 md:bottom-4">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask your doubt…"
          aria-label="Your doubt"
        />
        <Button type="submit" disabled={send.isPending} aria-label="Send">
          <Send className="size-4" aria-hidden />
        </Button>
      </form>
    </section>
  );
}

function NotesTab() {
  const make = useServerFn(generateNotes);
  const queryClient = useQueryClient();
  const [topic, setTopic] = useState("");
  const [subject, setSubject] = useState("");

  const notes = useQuery({
    queryKey: ["ai-notes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_notes")
        .select("id, title, subject, content, created_at")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
  });

  const create = useMutation({
    mutationFn: async () => make({ data: { topic, subject: subject || undefined, difficulty: "medium" } }),
    onSuccess: () => {
      setTopic("");
      toast.success("Notes ready.");
      void queryClient.invalidateQueries({ queryKey: ["ai-notes"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <section aria-label="Notes maker">
      <div className="surface grid gap-3 p-4">
        <div className="grid gap-1.5">
          <Label htmlFor="note-topic">Topic</Label>
          <Input
            id="note-topic"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. Time, Speed and Distance"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="note-subject">Subject (optional)</Label>
          <Input
            id="note-subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Quantitative Aptitude"
          />
        </div>
        <Button onClick={() => create.mutate()} disabled={topic.trim().length < 2 || create.isPending}>
          <Sparkles className="size-4" aria-hidden />
          {create.isPending ? "Writing notes…" : "Generate notes"}
        </Button>
      </div>

      <div className="mt-4 space-y-3">
        {notes.data?.map((note) => (
          <details key={note.id} className="surface p-4">
            <summary className="cursor-pointer font-display text-base font-extrabold">
              {note.title}
            </summary>
            <div className="mt-3">
              <Markdown content={note.content} />
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}

function QuestionsTab() {
  const generate = useServerFn(generateQuestions);
  const [subject, setSubject] = useState("Quantitative Aptitude");
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState<(typeof DIFFICULTIES)[number]>("medium");
  const [result, setResult] = useState<any[] | null>(null);

  const run = useMutation({
    mutationFn: async () => generate({ data: { subject, topic, difficulty, count: 5 } }),
    onSuccess: (res) => setResult(res.questions as any[]),
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <section aria-label="Question generator">
      <div className="surface grid gap-3 p-4">
        <div className="grid gap-1.5">
          <Label htmlFor="q-subject">Subject</Label>
          <Input id="q-subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="q-topic">Topic</Label>
          <Input
            id="q-topic"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. Percentages"
          />
        </div>
        <div className="flex gap-2">
          {DIFFICULTIES.map((level) => (
            <Button
              key={level}
              type="button"
              size="sm"
              variant={difficulty === level ? "default" : "outline"}
              onClick={() => setDifficulty(level)}
              className="capitalize"
            >
              {level}
            </Button>
          ))}
        </div>
        <Button onClick={() => run.mutate()} disabled={topic.trim().length < 2 || run.isPending}>
          <Sparkles className="size-4" aria-hidden />
          {run.isPending ? "Generating…" : "Generate 5 questions"}
        </Button>
      </div>

      <div className="mt-4 space-y-3">
        {result?.map((question, i) => (
          <article key={i} className="surface p-4">
            <p className="text-sm font-medium">
              {i + 1}. {question.question_text}
            </p>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              {(question.options as string[]).map((option, oi) => (
                <li
                  key={oi}
                  className={cn(option === question.correct_answer && "font-semibold text-success")}
                >
                  {String.fromCharCode(65 + oi)}. {option}
                </li>
              ))}
            </ul>
            {question.explanation ? (
              <p className="mt-2 text-sm text-muted-foreground">{question.explanation}</p>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}

function PlanTab() {
  const daily = useServerFn(generateDailyPlan);
  const longTerm = useServerFn(generateStudyPlan);
  const [targetDate, setTargetDate] = useState("");
  const [dailyMinutes, setDailyMinutes] = useState(90);
  const [content, setContent] = useState<string | null>(null);

  const today = useMutation({
    mutationFn: async () => daily({}),
    onSuccess: (res) => setContent(res.content),
    onError: (error: Error) => toast.error(error.message),
  });

  const plan = useMutation({
    mutationFn: async () => longTerm({ data: { targetDate: targetDate || null, dailyMinutes } }),
    onSuccess: (res: any) => setContent(res.content),
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <section aria-label="Study planner">
      <div className="surface grid gap-3 p-4">
        <Button onClick={() => today.mutate()} disabled={today.isPending}>
          <Sparkles className="size-4" aria-hidden />
          {today.isPending ? "Building…" : "Today's mission"}
        </Button>
        <div className="grid gap-1.5">
          <Label htmlFor="target-date">Target exam date (optional)</Label>
          <Input
            id="target-date"
            type="date"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="daily-minutes">Daily study minutes</Label>
          <Input
            id="daily-minutes"
            type="number"
            min={15}
            max={720}
            value={dailyMinutes}
            onChange={(e) => setDailyMinutes(Number(e.target.value))}
          />
        </div>
        <Button variant="outline" onClick={() => plan.mutate()} disabled={plan.isPending}>
          {plan.isPending ? "Planning…" : "Generate full study plan"}
        </Button>
      </div>

      {content ? (
        <div className="surface mt-4 p-4">
          <Markdown content={content} />
        </div>
      ) : null}
    </section>
  );
}
