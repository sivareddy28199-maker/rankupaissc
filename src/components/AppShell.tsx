import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  BarChart3,
  BookOpenCheck,
  Bot,
  GraduationCap,
  Home,
  LogOut,
  RefreshCcw,
  Shield,
  Target,
  User,
} from "lucide-react";
import type { ReactNode } from "react";

import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin, useProfile } from "@/hooks/useProfile";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const NAV = [
  { to: "/dashboard", label: "Home", icon: Home },
  { to: "/practice", label: "Practice", icon: Target },
  { to: "/tests", label: "Tests", icon: BookOpenCheck },
  { to: "/revision", label: "Revision", icon: RefreshCcw },
  { to: "/coach", label: "AI Coach", icon: Bot },
  { to: "/progress", label: "Progress", icon: BarChart3 },
  { to: "/profile", label: "Profile", icon: User },
] as const;

const MOBILE_NAV = NAV.filter((n) =>
  ["/dashboard", "/practice", "/tests", "/coach", "/progress"].includes(n.to),
);

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { data: profile } = useProfile();
  const { data: isAdmin } = useIsAdmin();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const initials = (profile?.full_name ?? profile?.email ?? "S").slice(0, 1).toUpperCase();

  return (
    <div className="min-h-screen bg-background">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-xl focus:border-2 focus:border-border focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-foreground"
      >
        Skip to content
      </a>

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-3 left-3 z-30 hidden w-60 flex-col rounded-3xl border-2 border-border bg-sidebar px-3 py-5 shadow-[6px_6px_0_0_var(--ink)] lg:flex">
        <Link to="/dashboard" className="mb-6 flex items-center gap-2 px-2 press">
          <span className="grid size-10 shrink-0 place-items-center rounded-2xl border-2 border-border bg-primary text-primary-foreground shadow-[3px_3px_0_0_var(--ink)]">
            <GraduationCap className="size-5" aria-hidden />
          </span>
          <span className="font-display text-xl font-extrabold">RankUp AI</span>
        </Link>
        <nav className="flex flex-1 flex-col gap-1.5" aria-label="Main">
          {NAV.map((item) => {
            const active = pathname.startsWith(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "press flex items-center gap-3 rounded-xl border-2 px-3 py-2.5 text-sm font-bold transition-all duration-200",
                  active
                    ? "border-border bg-primary text-primary-foreground shadow-[3px_3px_0_0_var(--ink)]"
                    : "border-transparent text-muted-foreground hover:border-border hover:bg-muted hover:text-foreground",
                )}
                aria-current={active ? "page" : undefined}
              >
                <item.icon className="size-4.5" aria-hidden />
                {item.label}
              </Link>
            );
          })}
          {isAdmin ? (
            <Link
              to="/admin"
              className={cn(
                "press flex items-center gap-3 rounded-xl border-2 px-3 py-2.5 text-sm font-bold transition-all duration-200",
                pathname.startsWith("/admin")
                  ? "border-border bg-coral text-coral-foreground shadow-[3px_3px_0_0_var(--ink)]"
                  : "border-transparent text-muted-foreground hover:border-border hover:bg-muted hover:text-foreground",
              )}
            >
              <Shield className="size-4.5" aria-hidden />
              Admin
            </Link>
          ) : null}
        </nav>
        <Button variant="outline" className="justify-start gap-3" onClick={signOut}>
          <LogOut className="size-4.5" aria-hidden />
          Sign out
        </Button>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b-2 border-border bg-background/90 px-4 backdrop-blur lg:hidden">
        <Link to="/dashboard" className="press flex min-w-0 items-center gap-2">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl border-2 border-border bg-primary text-primary-foreground shadow-[2px_2px_0_0_var(--ink)]">
            <GraduationCap className="size-4" aria-hidden />
          </span>
          <span className="truncate font-display text-lg font-extrabold">RankUp AI</span>
        </Link>
        <div className="flex shrink-0 items-center gap-2">
          {isAdmin ? (
            <Link
              to="/admin"
              aria-label="Admin"
              className="press grid size-10 place-items-center rounded-xl border-2 border-border bg-coral text-coral-foreground shadow-[2px_2px_0_0_var(--ink)]"
            >
              <Shield className="size-4.5" aria-hidden />
            </Link>
          ) : null}
          <Link
            to="/profile"
            aria-label="Profile"
            className="press grid size-10 place-items-center rounded-xl border-2 border-border bg-sky text-sm font-extrabold text-sky-foreground shadow-[2px_2px_0_0_var(--ink)]"
          >
            {initials}
          </Link>
        </div>
      </header>

      <main
        id="main"
        key={pathname}
        className="reveal mx-auto w-full max-w-5xl px-4 pb-28 pt-4 lg:pb-10 lg:pl-68"
      >
        {children}
      </main>

      {/* Mobile bottom nav */}
      <nav
        aria-label="Primary"
        className="fixed inset-x-3 bottom-3 z-30 grid grid-cols-5 gap-1 rounded-3xl border-2 border-border bg-card p-1.5 shadow-[4px_4px_0_0_var(--ink)] lg:hidden"
        style={{ marginBottom: "env(safe-area-inset-bottom)" }}
      >
        {MOBILE_NAV.map((item) => {
          const active = pathname.startsWith(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              aria-current={active ? "page" : undefined}
              className={cn(
                "press flex min-h-13 flex-col items-center justify-center gap-1 rounded-2xl px-1 py-1.5 text-[10px] font-bold transition-colors duration-200",
                active
                  ? "border-2 border-border bg-primary text-primary-foreground"
                  : "text-muted-foreground",
              )}
            >
              <item.icon className="size-5" aria-hidden />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export function PageHeader({
  title,
  description,
  action,
  eyebrow,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  eyebrow?: string;
}) {
  return (
    <div className="mb-5 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3 sm:flex sm:flex-wrap sm:justify-between">
      <div className="min-w-0">
        {eyebrow ? (
          <span className="mb-2 inline-flex items-center rounded-full border-2 border-border bg-coral px-3 py-0.5 text-[11px] font-extrabold uppercase tracking-wide text-coral-foreground">
            {eyebrow}
          </span>
        ) : null}
        <h1 className="font-display text-2xl font-extrabold leading-tight sm:text-3xl">{title}</h1>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}
