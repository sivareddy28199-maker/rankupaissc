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
import { ClayCard, Chip } from "@/components/kit";
import { STUDY_LEVELS } from "@/lib/config";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Profile — RankUp AI" },
      { name: "description", content: "SSC CGL profile, study settings and account." },
      { property: "og:title", content: "Profile — RankUp AI" },
      { property: "og:description", content: "SSC CGL preparation profile." },
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
  const [level, setLevel] = useState<string>("beginner");
  const [dailyGoal, setDailyGoal] = useState(30);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!profile) return;
    setFullName(profile.full_name ?? "");
    setLevel((profile as any).study_level ?? "beginner");
    setDailyGoal((profile as any).daily_question_goal ?? 30);
  }, [profile]);

  if (isLoading) return <LoadingState />;

  async function save() {
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName,
        study_level: level,
        daily_question_goal: dailyGoal,
        target_exam_code: "SSC-CGL",
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
        eyebrow="Account"
        title="Profile"
        description="Your SSC CGL preparation settings."
        action={
          <Chip tone="warning" className="capitalize">
            {profile?.plan_tier ?? "free"} plan
          </Chip>
        }
      />

      <ClayCard className="reveal grid gap-4" aria-label="Profile settings">
        <div className="rounded-2xl border-2 border-border bg-card p-4 text-center">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Exam Target</p>
          <p className="mt-1 font-display text-xl font-extrabold">SSC CGL</p>
          <p className="text-xs text-muted-foreground">Staff Selection Commission — Combined Graduate Level</p>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="full-name">Full name</Label>
          <Input id="full-name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>

        <div className="grid gap-1.5">
          <Label>Preparation level</Label>
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
      </ClayCard>

      <ClayCard tone="coral" className="reveal mt-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-display text-lg leading-tight">Sign out</p>
          <p className="text-sm opacity-80">You can sign back in any time.</p>
        </div>
        <Button variant="secondary" onClick={signOut}>
          Sign out
        </Button>
      </ClayCard>
    </>
  );
}
