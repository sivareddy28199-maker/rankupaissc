import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState, useRef, useEffect } from "react";
import { Sparkles, BookOpen, Check, Copy, RefreshCcw, ArrowRight } from "lucide-react";
import { toast } from "sonner";

import { generateNotes } from "@/lib/ai.functions";
import { SSC_SYLLABUS, SSC_SUBJECTS } from "@/lib/ssc";
import { supabase } from "@/integrations/supabase/client";
import { ClayCard, ClayProgress } from "@/components/kit";
import { Markdown } from "@/components/Markdown";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/AppShell";
import { LoadingState } from "@/components/States";

export const Route = createFileRoute("/_authenticated/coach")({
  head: () => ({
    meta: [
      { title: "AI Notes — RankUp AI" },
      { name: "description", content: "Generate exam-focused SSC CGL revision notes instantly." },
      { property: "og:title", content: "AI Notes — RankUp AI" },
      { property: "og:description", content: "Generate exam-focused SSC CGL revision notes instantly." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CoachPage,
});

function CoachPage() {
  const generate = useServerFn(generateNotes);
  const queryClient = useQueryClient();
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState<string | null>(null);
  const [detected, setDetected] = useState<{ subject: string; topic: string } | null>(null);
  const [saved, setSaved] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const detectTopic = (text: string): { subject: string; topic: string } | null => {
    const lower = text.toLowerCase();
    for (const subject of SSC_SUBJECTS) {
      const topics = SSC_SYLLABUS[subject] as string[];
      for (const t of topics) {
        if (lower.includes(t.toLowerCase()) || lower.includes(t.toLowerCase().split(" ")[0])) {
          return { subject, topic: t };
        }
      }
    }
    return null;
  };

  const mutation = useMutation({
    mutationFn: async () => {
      setLoading(true);
      setNotes(null);
      setDetected(null);
      setSaved(false);
      const result = await generate({ data: { topic: topic.trim(), difficulty: "medium", exam: "SSC CGL" } });
      return result;
    },
    onSuccess: (res: any) => {
      const contentText = res?.content || res?.note?.content || (typeof res === "string" ? res : JSON.stringify(res));
      setNotes(contentText);
      const detected = detectTopic(topic);
      setDetected(detected);
      setLoading(false);
    },
    onError: (err: Error) => {
      toast.error(err.message || "Could not generate notes. Try again.");
      setLoading(false);
    },
  });

  async function saveNotes() {
    if (!notes) return;
    try {
      await supabase.from("ai_notes").insert({
        user_id: (await supabase.auth.getSession()).data.session?.user?.id,
        title: topic,
        topic,
        subject: detected?.subject ?? null,
        difficulty: "medium",
        content: notes,
      });
      setSaved(true);
      toast.success("Notes saved.");
      queryClient.invalidateQueries({ queryKey: ["ai-notes"] });
    } catch {
      toast.error("Could not save notes.");
    }
  }

  const handleGenerate = () => {
    if (!topic.trim()) {
      toast.error("Enter a topic first.");
      inputRef.current?.focus();
      return;
    }
    mutation.mutate();
  };

  const detectedSubject = detected?.subject ?? detectTopic(topic)?.subject ?? null;
  const detectedTopic = detected?.topic ?? detectTopic(topic)?.topic ?? null;

  return (
    <>
      <PageHeader
        eyebrow="AI Notes"
        title="AI Notes Generator"
        description="Generate exam-focused revision notes from any SSC CGL topic."
      />

      <ClayCard tone="primary" className="reveal space-y-5 p-5 md:p-8">
        <div className="space-y-1">
          <h2 className="font-display text-2xl leading-tight">What do you want to learn?</h2>
          <p className="text-sm text-muted-foreground">Enter any SSC CGL topic — the AI will detect the subject automatically.</p>
        </div>

        <div className="relative">
          <textarea
            ref={inputRef}
            rows={2}
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !loading) {
                e.preventDefault();
                handleGenerate();
              }
            }}
            placeholder="Example: Fundamental Rights, Percentage, Mughal Empire, Articles of the Constitution..."
            aria-label="Topic for notes"
            className="w-full rounded-2xl border-2 border-border bg-card px-4 py-3.5 text-sm font-medium shadow-[4px_4px_0_0_var(--ink)] focus:ring-2 focus:ring-primary focus:outline-none resize-none min-h-[3.5rem]"
          />
        </div>

        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-muted-foreground">4 subjects · Auto-detected · No selection needed</span>
          <Button
            onClick={handleGenerate}
            disabled={loading || !topic.trim()}
            className="min-w-[10rem]"
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <span className="size-1.5 animate-bounce rounded-full bg-background" />
                <span className="size-1.5 animate-bounce rounded-full bg-background" style={{ animationDelay: "150ms" }} />
                <span className="size-1.5 animate-bounce rounded-full bg-background" style={{ animationDelay: "300ms" }} />
                Generating…
              </span>
            ) : (
              <>
                <Sparkles className="size-4" aria-hidden /> Generate Notes
              </>
            )}
          </Button>
        </div>

        {detectedSubject && detectedTopic && (
          <div className="flex gap-2">
            <span className="rounded-full border-2 border-border bg-sky/20 px-3 py-1 text-[11px] font-extrabold text-sky-foreground">{detectedSubject}</span>
            <span className="rounded-full border-2 border-border bg-coral/20 px-3 py-1 text-[11px] font-extrabold text-coral-foreground">{detectedTopic}</span>
          </div>
        )}
      </ClayCard>

      {notes && (
        <ClayCard tone="sky" className="reveal space-y-4 p-5 md:p-6">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="font-display text-xl">AI Notes</h2>
              <div className="mt-1 flex gap-2">
                {detectedSubject && (
                  <span className="rounded-full border-2 border-border bg-sky/20 px-2.5 py-0.5 text-[11px] font-extrabold text-sky-foreground">{detectedSubject}</span>
                )}
                {detectedTopic && (
                  <span className="rounded-full border-2 border-border bg-coral/20 px-2.5 py-0.5 text-[11px] font-extrabold text-coral-foreground">{detectedTopic}</span>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => navigator.clipboard?.writeText(notes ?? "")} aria-label="Copy notes">
                <Copy className="size-4" aria-hidden /> Copy
              </Button>
              <Button size="sm" variant="outline" onClick={() => { saveNotes(); }} disabled={saved} aria-label="Save notes">
                <BookOpen className="size-4" aria-hidden /> {saved ? "Saved" : "Save"}
              </Button>
            </div>
          </div>
          <div className="surface reveal bg-card/60 p-4 sm:p-5">
            <Markdown content={notes ?? ""} />
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" className="cta-arrow" onClick={() => { setNotes(null); setTopic(""); }}>
              <RefreshCcw className="size-4" aria-hidden /> New Notes <ArrowRight className="size-4" aria-hidden />
            </Button>
          </div>
        </ClayCard>
      )}
    </>
  );
}
