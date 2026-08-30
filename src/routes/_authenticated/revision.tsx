import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/AppShell";
import { EmptyState, ErrorState, LoadingState } from "@/components/States";
import { QuestionCard, type QuestionShape } from "@/components/QuestionCard";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { scheduleRevision } from "@/lib/study";

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
  "id, question_text, options, correct_answer, explanation, difficulty, topics(name), subjects(name)";

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

  return (
    <>
      <PageHeader title="Revision" description="Recall what you got wrong, right on time." />

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
                  onGrade={async (correct) => {
                    await scheduleRevision((item as any).user_id, (item as any).question_id, correct);
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
                    question={(item as any).questions as QuestionShape}
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
  onGrade,
}: {
  question: QuestionShape;
  index: number;
  total: number;
  onGrade: (correct: boolean) => Promise<void>;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  return (
    <div>
      <QuestionCard
        question={question}
        index={index}
        total={total}
        selected={selected}
        onSelect={(value) => {
          if (done) return;
          setSelected(value);
          setDone(true);
          void onGrade(value === question.correct_answer);
        }}
        revealed={done}
        disabled={done}
      />
    </div>
  );
}
