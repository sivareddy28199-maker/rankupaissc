import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, CalendarRange, ListChecks, MessageCircle, Plus, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { getAiStatus, sendCoachMessage, type CoachMode } from "@/lib/ai.functions";
import { ClayCard } from "@/components/kit";
import { Markdown } from "@/components/Markdown";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/coach")({
  head: () => ({
    meta: [
      { title: "AI coach — RankUp AI" },
      {
        name: "description",
        content: "Chat with your AI coach: doubts, revision notes, practice questions and study plans.",
      },
      { property: "og:title", content: "AI coach — RankUp AI" },
      { property: "og:description", content: "Doubt solver, notes maker and study planner in one chat." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CoachPage,
});

type ChatMessage = { id: string; role: "user" | "assistant"; content: string; created_at?: string };
type Conversation = { id: string; title: string; kind: string; updated_at: string };

const MODES: { value: CoachMode; label: string; icon: typeof MessageCircle; placeholder: string; tone: string }[] = [
  {
    value: "tutor",
    label: "Chat",
    icon: MessageCircle,
    placeholder: "Ask any SSC CGL doubt or get performance insights…",
    tone: "bg-primary text-primary-foreground",
  },
  {
    value: "notes",
    label: "Notes",
    icon: BookOpen,
    placeholder: "Topic for revision notes, e.g. Fundamental Rights",
    tone: "bg-sky text-sky-foreground",
  },
  {
    value: "questions",
    label: "Practice",
    icon: ListChecks,
    placeholder: "Topic for practice questions, e.g. Percentage",
    tone: "bg-coral text-coral-foreground",
  },
];

function CoachPage() {
  const queryClient = useQueryClient();
  const send = useServerFn(sendCoachMessage);

  const [mode, setMode] = useState<CoachMode>("tutor");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [subject, setSubject] = useState("");
  const [pending, setPending] = useState<ChatMessage[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const status = useQuery({ queryKey: ["ai-status"], queryFn: () => getAiStatus() });

  const conversations = useQuery({
    queryKey: ["ai-conversations"],
    queryFn: async (): Promise<Conversation[]> => {
      const { data, error } = await supabase
        .from("ai_conversations")
        .select("id, title, kind, updated_at")
        .order("updated_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as Conversation[];
    },
  });

  const messages = useQuery({
    queryKey: ["ai-messages", conversationId],
    enabled: !!conversationId,
    queryFn: async (): Promise<ChatMessage[]> => {
      const { data, error } = await supabase
        .from("ai_messages")
        .select("id, role, content, created_at")
        .eq("conversation_id", conversationId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as ChatMessage[];
    },
  });

  const thread = useMemo<ChatMessage[]>(
    () => [...(conversationId ? (messages.data ?? []) : []), ...pending],
    [conversationId, messages.data, pending],
  );

  const ask = useMutation({
    mutationFn: async (message: string) =>
      send({
        data: {
          conversationId,
          mode,
          message,
          subject: subject.trim() || undefined,
          difficulty: "medium",
          dailyMinutes: 90,
          targetDate: null,
        },
      }),
    onSuccess: async (res) => {
      setConversationId(res.conversationId);
      setPending([]);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["ai-messages", res.conversationId] }),
        queryClient.invalidateQueries({ queryKey: ["ai-conversations"] }),
        queryClient.invalidateQueries({ queryKey: ["ai-status"] }),
        queryClient.invalidateQueries({ queryKey: ["ai-notes"] }),
      ]);
    },
    onError: (error: Error) => {
      setPending([]);
      toast.error(error.message);
    },
  });

  // Auto-scroll to the latest message.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [thread.length, ask.isPending]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [conversationId, mode]);

  function submit() {
    const message = input.trim();
    if (message.length < 2 || ask.isPending) return;
    setPending([{ id: `local-${Date.now()}`, role: "user", content: message }]);
    setInput("");
    ask.mutate(message);
  }

  function newChat(nextMode: CoachMode = mode) {
    setConversationId(null);
    setPending([]);
    setInput("");
    setMode(nextMode);
    setHistoryOpen(false);
    inputRef.current?.focus();
  }

  async function openConversation(conversation: Conversation) {
    setConversationId(conversation.id);
    setPending([]);
    if (MODES.some((m) => m.value === conversation.kind)) setMode(conversation.kind as CoachMode);
    setHistoryOpen(false);
  }

  const remove = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("ai_messages").delete().eq("conversation_id", id);
      const { error } = await supabase.from("ai_conversations").delete().eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: (id) => {
      if (id === conversationId) newChat();
      void queryClient.invalidateQueries({ queryKey: ["ai-conversations"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const active = MODES.find((m) => m.value === mode)!;

  const historyPanel = (
    <ConversationList
      conversations={conversations.data ?? []}
      activeId={conversationId}
      onSelect={openConversation}
      onDelete={(id) => remove.mutate(id)}
      onNew={() => newChat()}
    />
  );

  return (
    <div className="flex h-[calc(100dvh-11rem)] gap-4 md:h-[calc(100dvh-8rem)]">
      <aside className="hidden w-64 shrink-0 lg:block">
        <div className="surface flex h-full flex-col overflow-hidden p-3">{historyPanel}</div>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col">
        <ClayCard tone="ink" className="reveal mb-3 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
                <SheetTrigger asChild>
                  <Button size="sm" variant="secondary" className="lg:hidden">
                    Chats
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[85vw] max-w-sm p-4">
                  <SheetHeader>
                    <SheetTitle className="font-display">Your chats</SheetTitle>
                  </SheetHeader>
                  <div className="mt-3 flex h-[calc(100%-4rem)] flex-col">{historyPanel}</div>
                </SheetContent>
              </Sheet>
              <span className="inline-flex items-center gap-2 rounded-full border-2 border-border bg-primary px-3 py-1 text-xs font-extrabold text-primary-foreground">
                <span className="size-2 rounded-full bg-foreground" aria-hidden />
                AI online
              </span>
            </div>
            <div className="flex items-center gap-2">
              {status.data ? (
                <span className="rounded-full border-2 border-border bg-warning px-3 py-1 text-xs font-extrabold text-warning-foreground">
                  {status.data.used}/{status.data.limit} today
                </span>
              ) : null}
              <Button size="sm" variant="secondary" onClick={() => newChat()} className="lg:hidden">
                <Plus className="size-4" aria-hidden />
                New
              </Button>
            </div>
          </div>
          <h1 className="mt-3 font-display text-2xl leading-tight sm:text-3xl">Your AI Coach</h1>
        </ClayCard>

        <div className="mb-3 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Coach mode">
          {MODES.map((m) => {
            const Icon = m.icon;
            const selected = m.value === mode;
            return (
              <button
                key={m.value}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setMode(m.value)}
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 rounded-full border-2 border-border px-3.5 py-1.5 text-xs font-extrabold transition-transform duration-150 active:translate-y-0.5",
                  selected ? cn(m.tone, "clay-sm") : "bg-card text-foreground hover:-translate-y-0.5",
                )}
              >
                <Icon className="size-4" aria-hidden />
                {m.label}
              </button>
            );
          })}
        </div>

        <div
          ref={scrollRef}
          className="surface min-h-0 flex-1 space-y-3 overflow-y-auto p-3 sm:p-4"
          aria-live="polite"
        >
          {thread.length === 0 && !ask.isPending ? (
            <div className="grid h-full place-items-center px-4 text-center">
              <div className="max-w-sm">
                <p className="font-display text-xl">Start a new {active.label.toLowerCase()} chat</p>
                <p className="mt-1 text-sm text-muted-foreground">{active.placeholder}</p>
              </div>
            </div>
          ) : null}

          {thread.map((message) => (
            <div
              key={message.id}
              className={cn(
                "reveal max-w-[92%] px-4 py-3 text-sm sm:max-w-[80%]",
                message.role === "user"
                  ? "clay-sm ml-auto bg-primary font-semibold text-primary-foreground"
                  : "clay-sm mr-auto bg-card text-card-foreground",
              )}
            >
              {message.role === "assistant" ? (
                <Markdown content={message.content} />
              ) : (
                <p className="whitespace-pre-wrap">{message.content}</p>
              )}
            </div>
          ))}

          {ask.isPending ? (
            <div className="clay-sm mr-auto inline-flex items-center gap-1.5 bg-card px-4 py-3">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="size-2.5 animate-bounce rounded-full bg-foreground"
                  style={{ animationDelay: `${i * 150}ms` }}
                />
              ))}
              <span className="ml-1 text-xs font-bold text-muted-foreground">Thinking…</span>
            </div>
          ) : null}
        </div>

        {mode === "notes" || mode === "questions" ? (
          <Input
            className="mt-3"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject (optional), e.g. Quantitative Aptitude"
            aria-label="Subject"
          />
        ) : null}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="mt-3 flex items-end gap-2"
        >
          <Textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            rows={1}
            placeholder={active.placeholder}
            aria-label="Message"
            className="max-h-32 min-h-11 flex-1 resize-none"
          />
          <Button type="submit" disabled={ask.isPending || input.trim().length < 2} aria-label="Send">
            <Send className="size-4" aria-hidden />
          </Button>
        </form>
      </section>
    </div>
  );
}

function ConversationList({
  conversations,
  activeId,
  onSelect,
  onDelete,
  onNew,
}: {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (c: Conversation) => void;
  onDelete: (id: string) => void;
  onNew: () => void;
}) {
  return (
    <>
      <Button onClick={onNew} className="w-full">
        <Plus className="size-4" aria-hidden />
        New chat
      </Button>
      <div className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
        {conversations.length === 0 ? (
          <p className="px-1 py-4 text-xs text-muted-foreground">
            Your conversations will appear here.
          </p>
        ) : null}
        {conversations.map((c) => (
          <div
            key={c.id}
            className={cn(
              "flex items-center gap-1 rounded-xl border-2 border-border px-2 py-1.5 transition-transform duration-150",
              c.id === activeId ? "bg-sky text-sky-foreground" : "bg-card hover:-translate-y-0.5",
            )}
          >
            <button
              type="button"
              onClick={() => onSelect(c)}
              className="min-w-0 flex-1 text-left"
              title={c.title}
            >
              <p className="truncate text-xs font-bold">{c.title}</p>
              <p className="truncate text-[10px] uppercase tracking-wide opacity-70">{c.kind}</p>
            </button>
            <button
              type="button"
              onClick={() => onDelete(c.id)}
              aria-label={`Delete ${c.title}`}
              className="shrink-0 rounded-lg p-1.5 opacity-60 hover:opacity-100"
            >
              <Trash2 className="size-3.5" aria-hidden />
            </button>
          </div>
        ))}
      </div>
    </>
  );
}
