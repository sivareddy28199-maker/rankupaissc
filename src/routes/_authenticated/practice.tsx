import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/AppShell";
import { EmptyState, ErrorState, LoadingState } from "@/components/States";
import { QuestionCard, type QuestionShape } from "@/components/QuestionCard";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DIFFICULTIES, PRACTICE_SIZES } from "@/lib/config";
import { recordActivity, scheduleRevision } from "@/lib/study";

export const Route = createFileRoute("/_authenticated/practice")({
  head: () => ({
    meta: [
      { title: "Practice questions — RankUp AI" },
      {
        name: "description",
        content: "Practise subject and topic-wise questions with instant feedback and explanations.",
      },
      { property: "og:title", content: "Practice questions — RankUp AI" },
      {
        property: "og:description",
        content: "Subject and topic-wise practice with instant explanations.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PracticePage,
});

interface Session {
  id: string;
  questions: QuestionShape[];
}

function PracticePage() {
  const queryClient = useQueryClient();
  const [subjectId, setSubjectId] = useState<string>("");
  const [topicId, setTopicId] = useState<string>("all");
  const [difficulty, setDifficulty] = useState<string>("all");
  const [count, setCount] = useState<number>(10);
  const [session, setSession] = useState<Session | null>(null);

  const subjects = useQuery({
    queryKey: ["subjects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subjects")
        .select("id, name, exam_id")
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const topics = useQuery({
    queryKey: ["topics", subjectId],
    enabled: Boolean(subjectId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("topics")
        .select("id, name")
        .eq("subject_id", subjectId)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (!subjectId && subjects.data?.length) setSubjectId(subjects.data[0]!.id);
  }, [subjects.data, subjectId]);

  const start = useMutation({
    mutationFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth.user?.id;
      if (!userId) throw new Error("Not signed in");

      let query = supabase
        .from("questions")
        .select("id, question_text, options, correct_answer, explanation, difficulty, topics(name), subjects(name)")
        .eq("is_published", true)
        .eq("subject_id", subjectId)
        .limit(count * 3);
      if (topicId !== "all") query = query.eq("topic_id", topicId);
      if (difficulty !== "all") query = query.eq("difficulty", difficulty);

      const { data, error } = await query;
      if (error) throw error;
      const picked = [...(data ?? [])].sort(() => Math.random() - 0.5).slice(0, count);
      if (picked.length === 0) throw new Error("No questions match that selection yet.");

      const subject = subjects.data?.find((s) => s.id === subjectId);
      const { data: created, error: sessionError } = await supabase
        .from("practice_sessions")
        .insert({
          user_id: userId,
          exam_id: subject?.exam_id ?? null,
          subject_id: subjectId,
          topic_id: topicId === "all" ? null : topicId,
          difficulty: difficulty === "all" ? null : difficulty,
          total_questions: picked.length,
        })
        .select("id")
        .single();
      if (sessionError) throw sessionError;

      return { id: created.id as string, questions: picked as unknown as QuestionShape[] };
    },
    onSuccess: (data) => setSession(data),
    onError: (error: Error) => toast.error(error.message),
  });

  if (session) {
    return (
      <PracticeRunner
        session={session}
        onExit={() => {
          setSession(null);
          void queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
          void queryClient.invalidateQueries({ queryKey: ["progress"] });
        }}
      />
    );
  }

  if (subjects.isLoading) return <LoadingState label="Loading subjects…" />;
  if (subjects.isError) return <ErrorState onRetry={() => subjects.refetch()} />;
  if (!subjects.data?.length)
    return <EmptyState title="No subjects yet" description="Content is still being added." />;

  return (
    <>
      <PageHeader title="Practice" description="Pick a focus area and start solving." />
      <div className="surface flex flex-col gap-4 p-4 sm:p-5">
        <Field label="Subject">
          <Select value={subjectId} onValueChange={(v) => { setSubjectId(v); setTopicId("all"); }}>
            <SelectTrigger aria-label="Subject">
              <SelectValue placeholder="Choose subject" />
            </SelectTrigger>
            <SelectContent>
              {subjects.data.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="Topic">
          <Select value={topicId} onValueChange={setTopicId}>
            <SelectTrigger aria-label="Topic">
              <SelectValue placeholder="All topics" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All topics</SelectItem>
              {(topics.data ?? []).map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Difficulty">
            <Select value={difficulty} onValueChange={setDifficulty}>
              <SelectTrigger aria-label="Difficulty">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Mixed</SelectItem>
                {DIFFICULTIES.map((d) => (
                  <SelectItem key={d} value={d} className="capitalize">
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Questions">
            <Select value={String(count)} onValueChange={(v) => setCount(Number(v))}>
              <SelectTrigger aria-label="Number of questions">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRACTICE_SIZES.map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>

        <Button onClick={() => start.mutate()} disabled={start.isPending || !subjectId}>
          {start.isPending ? "Preparing…" : "Start practice"}
        </Button>
      </div>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function PracticeRunner({ session, onExit }: { session: Session; onExit: () => void }) {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [bookmarked, setBookmarked] = useState<Record<string, boolean>>({});
  const [finished, setFinished] = useState(false);
  const startedAt = useRef(Date.now());
  const questionStart = useRef(Date.now());

  const question = session.questions[index]!;
  const total = session.questions.length;

  async function submitAnswer() {
    if (!selected || revealed) return;
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth.user?.id;
    if (!userId) return;

    const isCorrect = selected === question.correct_answer;
    setRevealed(true);
    if (isCorrect) setCorrect((c) => c + 1);
    else setWrong((w) => w + 1);

    await supabase.from("practice_answers").insert({
      session_id: session.id,
      user_id: userId,
      question_id: question.id,
      selected_answer: selected,
      correct_answer: question.correct_answer,
      is_correct: isCorrect,
      time_taken_seconds: Math.round((Date.now() - questionStart.current) / 1000),
    });
    if (!isCorrect) await scheduleRevision(userId, question.id, false);
  }

  async function next() {
    if (index + 1 >= total) return finish();
    setIndex((i) => i + 1);
    setSelected(null);
    setRevealed(false);
    questionStart.current = Date.now();
  }

  async function finish() {
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth.user?.id;
    const seconds = Math.round((Date.now() - startedAt.current) / 1000);
    const answered = correct + wrong;
    await supabase
      .from("practice_sessions")
      .update({
        correct_count: correct,
        wrong_count: wrong,
        skipped_count: total - answered,
        time_spent_seconds: seconds,
        status: "completed",
        completed_at: new Date().toISOString(),
      })
      .eq("id", session.id);
    if (userId) {
      await recordActivity({
        userId,
        activity: "practice",
        minutes: Math.max(1, Math.round(seconds / 60)),
        questions: answered,
      });
    }
    setFinished(true);
  }

  async function toggleBookmark() {
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth.user?.id;
    if (!userId) return;
    if (bookmarked[question.id]) {
      await supabase.from("bookmarks").delete().eq("user_id", userId).eq("question_id", question.id);
      setBookmarked((b) => ({ ...b, [question.id]: false }));
      toast.success("Bookmark removed");
      return;
    }
    await supabase.from("bookmarks").insert({ user_id: userId, question_id: question.id });
    setBookmarked((b) => ({ ...b, [question.id]: true }));
    toast.success("Saved to bookmarks");
  }

  if (finished) {
    const answered = correct + wrong;
    return (
      <>
        <PageHeader title="Practice complete" description="Every attempt is saved to your progress." />
        <div className="surface p-5">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="font-display text-2xl font-semibold text-success">{correct}</p>
              <p className="text-xs text-muted-foreground">Correct</p>
            </div>
            <div>
              <p className="font-display text-2xl font-semibold text-destructive">{wrong}</p>
              <p className="text-xs text-muted-foreground">Wrong</p>
            </div>
            <div>
              <p className="font-display text-2xl font-semibold">
                {answered ? Math.round((correct / answered) * 100) : 0}%
              </p>
              <p className="text-xs text-muted-foreground">Accuracy</p>
            </div>
          </div>
          <Button className="mt-5 w-full" onClick={onExit}>
            Back to practice setup
          </Button>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Practice"
        description={`${correct} correct · ${wrong} wrong`}
        action={
          <Button variant="ghost" size="sm" onClick={finish}>
            End session
          </Button>
        }
      />
      <QuestionCard
        question={question}
        index={index}
        total={total}
        selected={selected}
        onSelect={(value) => !revealed && setSelected(value)}
        revealed={revealed}
        disabled={revealed}
        bookmarked={Boolean(bookmarked[question.id])}
        onToggleBookmark={toggleBookmark}
      />
      <div className="mt-4 flex gap-3">
        {!revealed ? (
          <>
            <Button className="flex-1" onClick={submitAnswer} disabled={!selected}>
              Check answer
            </Button>
            <Button variant="outline" onClick={next}>
              Skip
            </Button>
          </>
        ) : (
          <Button className="flex-1" onClick={next}>
            {index + 1 >= total ? "Finish" : "Next question"}
          </Button>
        )}
      </div>
    </>
  );
}
