import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/AppShell";
import { LoadingState } from "@/components/States";
import { useProfile } from "@/hooks/useProfile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { STUDY_LEVELS } from "@/lib/config";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Your profile — RankUp AI" },
      { name: "description", content: "Manage your exam target, study level, daily goals and account." },
      { property: "og:title", content: "Your profile — RankUp AI" },
      { property: "og:description", content: "Manage your exam target, study level and daily goals." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: profile, isLoading } = useProfile();

  const [fullName, setFullName] = useState("");
  const [examId, setExamId] = useState<string | null>(null);
  const [level, setLevel] = useState<string>("beginner");
  const [dailyGoal, setDailyGoal] = useState(20);
  const [saving, setSaving] = useState(false);

  const exams = useQuery({
    queryKey: ["exams"],
    queryFn: async () => {
      const { data, error } = await supabase.from("exams").select("id, name").eq("is_active", true);
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (!profile) return;
    setFullName(profile.full_name ?? "");
    setExamId((profile as any).target_exam_id ?? null);
    setLevel((profile as any).study_level ?? "beginner");
    setDailyGoal((profile as any).daily_goal_questions ?? 20);
  }, [profile]);

  if (isLoading) return <LoadingState />;

  async function save() {
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName,
        target_exam_id: examId,
        study_level: level,
        daily_goal_questions: dailyGoal,
      })
      .eq("id", profile!.id);
    setSaving(false);
    if (error) {
      toast.error("Could not save your profile.");
      return;
    }
    toast.success("Profile updated.");
    void queryClient.invalidateQueries({ queryKey: ["profile"] });
  }

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <>
      <PageHeader
        title="Profile"
        description="Tune RankUp AI to your exam and pace."
        action={<Badge variant="secondary" className="capitalize">{profile?.plan_tier ?? "free"} plan</Badge>}
      />

      <section className="surface grid gap-4 p-4" aria-label="Profile settings">
        <div className="grid gap-1.5">
          <Label htmlFor="full-name">Full name</Label>
          <Input id="full-name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="exam">Target exam</Label>
          <select
            id="exam"
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            value={examId ?? ""}
            onChange={(e) => setExamId(e.target.value || null)}
          >
            <option value="">Not selected</option>
            {exams.data?.map((exam) => (
              <option key={exam.id} value={exam.id}>
                {exam.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-1.5">
          <Label>Study level</Label>
          <div className="flex gap-2">
            {STUDY_LEVELS.map((option) => (
              <Button
                key={option}
                type="button"
                size="sm"
                variant={level === option ? "default" : "outline"}
                className="capitalize"
                onClick={() => setLevel(option)}
              >
                {option}
              </Button>
            ))}
          </div>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="daily-goal">Daily question goal</Label>
          <Input
            id="daily-goal"
            type="number"
            min={5}
            max={300}
            value={dailyGoal}
            onChange={(e) => setDailyGoal(Number(e.target.value))}
          />
        </div>

        <Button onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </section>

      <Button variant="outline" className="mt-4 w-full" onClick={signOut}>
        Sign out
      </Button>
    </>
  );
}
