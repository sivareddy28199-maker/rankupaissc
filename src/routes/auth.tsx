import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { GraduationCap, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in — RankUp AI exam preparation" },
      {
        name: "description",
        content:
          "Sign in or create your free RankUp AI account to practise SSC CGL questions, take mock tests and get an AI study coach.",
      },
      { property: "og:title", content: "Sign in — RankUp AI" },
      {
        property: "og:description",
        content: "Create a free RankUp AI account and start preparing with AI-guided practice.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);
  const [forgot, setForgot] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;

    if (forgot) {
      if (!email) { toast.error("Enter your email first."); return; }
      setBusy(true);
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset`,
      });
      setBusy(false);
      if (error) { toast.error(error.message); return; }
      toast.success("Password reset link sent. Check your inbox.");
      setForgot(false);
      return;
    }

    if (password.length < 6) { toast.error("Password must be at least 6 characters."); return; }
    setBusy(true);

    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
          data: { full_name: fullName || email.split("@")[0] },
        },
      });
      setBusy(false);
      if (error) { toast.error(error.message); return; }
      const { data: session } = await supabase.auth.getSession();
      if (session.session) {
        toast.success("Account created. Welcome to RankUp AI.");
        navigate({ to: "/dashboard", replace: true });
      } else {
        toast.success("Account created. Confirm your email, then sign in.");
        setMode("signin");
      }
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    navigate({ to: "/dashboard", replace: true });
  }

  async function googleSignIn() {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setBusy(false);
      toast.error("Google sign-in failed. Please try again.");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/dashboard", replace: true });
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-10">
      <Link
        to="/"
        className="press mb-6 flex items-center gap-2.5 rounded-full border-2 border-border bg-card px-4 py-2 shadow-[3px_3px_0_0_var(--ink)]"
      >
        <span className="grid size-9 place-items-center rounded-full border-2 border-border bg-primary text-primary-foreground">
          <GraduationCap className="size-5" aria-hidden />
        </span>
        <span className="font-display text-xl font-extrabold">RankUp AI</span>
      </Link>

      <div className="surface reveal w-full max-w-sm p-5 shadow-[6px_7px_0_0_var(--ink)]">
        {forgot ? (
          <>
            <h1 className="font-display text-2xl leading-tight">Reset your password</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              We will email you a secure reset link.
            </p>
          </>
        ) : (
          <Tabs value={mode} onValueChange={(v) => setMode(v as "signin" | "signup")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Create account</TabsTrigger>
            </TabsList>
            <TabsContent value="signin" />
            <TabsContent value="signup" />
          </Tabs>
        )}

        <form className="mt-4 flex flex-col gap-3" onSubmit={handleSubmit}>
          {mode === "signup" && !forgot ? (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="fullName">Full name</Label>
              <Input
                id="fullName"
                autoComplete="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your name"
              />
            </div>
          ) : null}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>

          {!forgot ? (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
              />
            </div>
          ) : null}

          <Button type="submit" disabled={busy} className="mt-1">
            {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
            {forgot ? "Send reset link" : mode === "signup" ? "Create account" : "Sign in"}
          </Button>
        </form>

        {!forgot ? (
          <>
            <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-border" />
              or
              <span className="h-px flex-1 bg-border" />
            </div>
            <Button variant="outline" className="w-full" onClick={googleSignIn} disabled={busy}>
              Continue with Google
            </Button>
          </>
        ) : null}

        <button
          type="button"
          className="mt-4 w-full text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
          onClick={() => setForgot((f) => !f)}
        >
          {forgot ? "Back to sign in" : "Forgot your password?"}
        </button>
      </div>
    </div>
  );
}
