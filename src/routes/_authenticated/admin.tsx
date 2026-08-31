import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/AppShell";
import { EmptyState, LoadingState } from "@/components/States";
import { useIsAdmin } from "@/hooks/useProfile";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Admin — RankUp AI" },
      { name: "description", content: "Content and usage overview for RankUp AI administrators." },
      { property: "og:title", content: "Admin — RankUp AI" },
      { property: "og:description", content: "Content and usage overview for administrators." },
      { property: "og:type", content: "website" },
      { name: "robots", content: "noindex" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { data: isAdmin, isLoading: checking } = useIsAdmin();

  const stats = useQuery({
    enabled: isAdmin === true,
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const counts = await Promise.all(
        (["questions", "tests", "subjects", "topics"] as const).map(async (table) => {
          const { count } = await supabase.from(table).select("id", { count: "exact", head: true });
          return [table, count ?? 0] as const;
        }),
      );
      const { data: generations } = await supabase
        .from("ai_generations")
        .select("capability, provider, success, created_at")
        .order("created_at", { ascending: false })
        .limit(25);
      return { counts, generations: generations ?? [] };
    },
  });

  if (checking) return <LoadingState />;
  if (!isAdmin)
    return (
      <EmptyState
        title="Admins only"
        description="You don't have permission to view this area."
      />
    );

  return (
    <>
      <PageHeader title="Admin" description="Content library and AI usage at a glance." />

      {stats.isLoading ? (
        <LoadingState />
      ) : (
        <>
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="Content counts">
            {stats.data?.counts.map(([table, count]) => (
              <div key={table} className="surface p-4">
                <p className="text-xs capitalize text-muted-foreground">{table}</p>
                <p className="mt-1 font-display text-2xl font-semibold">{count}</p>
              </div>
            ))}
          </section>

          <section className="surface mt-5 p-4" aria-labelledby="ai-usage">
            <h2 id="ai-usage" className="mb-3 text-sm font-semibold">
              Recent AI generations
            </h2>
            {stats.data?.generations.length ? (
              <ul className="space-y-2 text-sm">
                {stats.data.generations.map((row, i) => (
                  <li key={i} className="flex items-center justify-between gap-3">
                    <span>{row.capability}</span>
                    <span className="text-muted-foreground">
                      {row.provider} · {row.success ? "ok" : "failed"} ·{" "}
                      {new Date(row.created_at).toLocaleString()}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No AI usage recorded yet.</p>
            )}
          </section>
        </>
      )}
    </>
  );
}
