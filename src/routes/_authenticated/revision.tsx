import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/AppShell";
import { StatCard } from "@/components/kit";
import { EmptyState, ErrorState, LoadingState } from "@/components/States";
import { QuestionCard, type QuestionShape } from "@/components/QuestionCard";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { answerRevisionQuestion, getAttemptedAnswerKeys, type AnswerKey } from "@/lib/questions.functions";

export const Route = createFileRoute("/_authenticated/revision")({
  head: () => ({
    meta: [
      { title: "Revision — RankUp AI" },
      {
        name: "description",
        content: "Spaced-repetition revision queue and bookmarked questions for daily recall practice.",
      },
      { property: "og:title", content: "Revision — RankUp AI" },
      { property: "og:description", content: "Spaced repetition queue and bookmarks." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RevisionPage,
});

const QUESTION_SELECT =
  "id, question_text, options, difficulty, topics(name), subjects(name)";

function RevisionPage() {
  const queryClient = useQueryClient();

  const due = useQuery({
    queryKey: ["revision-due"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("revision_items")
        .select(`id, user_id, question_id, next_review_date, questions(${QUESTION_SELECT})`)
        .lte("next_review_date", new Date().toISOString().slice(0, 10))
        .order("next_review_date")
        .limit(30);
      if (error) throw error;
      return data;
    },
  });

  const bookmarks = useQuery({
    queryKey: ["bookmarks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookmarks")
        .select(`id, questions(${QUESTION_SELECT})`)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  const loadKeys = useServerFn(getAttemptedAnswerKeys);
  const bookmarkKeys = useQuery({
    queryKey: ["bookmark-keys", (bookmarks.data ?? []).map((b: any) => b.questions?.id).join(",")],
    enabled: Boolean(bookmarks.data?.length),
    queryFn: async () =>
      (await loadKeys({
        data: {
          questionIds: (bookmarks.data ?? [])
            .map((b: any) => b.questions?.id as string | undefined)
            .filter((id): id is string => Boolean(id)),
        },
      })) as AnswerKey[],
  });
  const keyById = new Map(((bookmarkKeys.data ?? []) as AnswerKey[]).map((k) => [k.question_id, k]));

  return (
    <>
      <PageHeader
        eyebrow="Smart revision"
        title="Never forget what you learn."
        description="Spaced repetition and bookmarks keep old topics alive."
      />

      <section className="mb-5 grid grid-cols-2 gap-3" aria-label="Revision summary">
        <StatCard tone="primary" label="Due for revision" value={`${due.data?.length ?? 0} items`} />
        <StatCard tone="sky" label="Bookmarked" value={`${bookmarks.data?.length ?? 0} questions`} />
      </section>

      <Tabs defaultValue="due">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="due">Due today ({due.data?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="bookmarks">Bookmarks ({bookmarks.data?.length ?? 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="due" className="mt-4">
          {due.isLoading ? (
            <LoadingState />
          ) : due.isError ? (
            <ErrorState onRetry={() => due.refetch()} />
          ) : !due.data?.length ? (
            <EmptyState
              title="Nothing due"
              description="Your revision queue is clear. Practise more to build it up."
            />
          ) : (
            <div className="space-y-4">
              {due.data.map((item, i) => (
                <RevisionItem
                  key={item.id}
                  index={i}
                  total={due.data.length}
                  question={(item as any).questions as QuestionShape}
                  onAnswered={() => {
                    void queryClient.invalidateQueries({ queryKey: ["revision-due"] });
                  }}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="bookmarks" className="mt-4">
          {bookmarks.isLoading ? (
            <LoadingState />
          ) : !bookmarks.data?.length ? (
            <EmptyState title="No bookmarks yet" description="Bookmark tricky questions while practising." />
          ) : (
            <div className="space-y-4">
              {bookmarks.data.map((item, i) => (
                <div key={item.id}>
                  <QuestionCard
                    question={
                      {
                        ...((item as any).questions as QuestionShape),
                        correct_answer:
                          keyById.get((item as any).questions?.id)?.correct_answer ?? null,
                        explanation: keyById.get((item as any).questions?.id)?.explanation ?? null,
                      } as QuestionShape
                    }
                    index={i}
                    total={bookmarks.data.length}
                    selected={null}
                    onSelect={() => undefined}
                    revealed
                    disabled
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2"
                    onClick={async () => {
                      await supabase.from("bookmarks").delete().eq("id", item.id);
                      toast.success("Bookmark removed.");
                      void queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
                    }}
                  >
                    Remove bookmark
                  </Button>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </>
  );
}

function RevisionItem({
  question,
  index,
  total,
  onAnswered,
}: {
  question: QuestionShape;
  index: number;
  total: number;
  onAnswered: () => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [key, setKey] = useState<{ correctAnswer: string; explanation: string | null } | null>(null);
  const grade = useServerFn(answerRevisionQuestion);

  return (
    <div>
      <QuestionCard
        question={
          key
            ? { ...question, correct_answer: key.correctAnswer, explanation: key.explanation }
            : question
        }
        index={index}
        total={total}
        selected={selected}
        onSelect={(value) => {
          if (done) return;
          setSelected(value);
          setDone(true);
          void (async () => {
            try {
              const result = (await grade({
                data: { questionId: question.id, selectedAnswer: value },
              })) as { correctAnswer: string; explanation: string | null };
              setKey({ correctAnswer: result.correctAnswer, explanation: result.explanation });
              onAnswered();
            } catch (error) {
              toast.error(error instanceof Error ? error.message : "Could not grade that answer.");
            }
          })();
        }}
        revealed={done}
        disabled={done}
      />
    </div>
  );
}
