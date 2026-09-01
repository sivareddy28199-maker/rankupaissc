import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Tactile clay card. Tone drives the surface color. */
export function ClayCard({
  tone = "card",
  className,
  interactive,
  children,
  ...rest
}: {
  tone?: "card" | "primary" | "sky" | "coral" | "ink" | "muted" | "warning";
  interactive?: boolean;
  className?: string;
  children: ReactNode;
} & React.HTMLAttributes<HTMLDivElement>) {
  const tones: Record<string, string> = {
    card: "bg-card text-card-foreground",
    primary: "bg-primary text-primary-foreground",
    sky: "bg-sky text-sky-foreground",
    coral: "bg-coral text-coral-foreground",
    ink: "bg-foreground text-background",
    muted: "bg-muted text-foreground",
    warning: "bg-warning text-warning-foreground",
  };
  return (
    <div
      className={cn("clay p-5", tones[tone], interactive && "tactile", className)}
      {...rest}
    >
      {children}
    </div>
  );
}

export function Chip({
  children,
  tone = "card",
  className,
}: {
  children: ReactNode;
  tone?: "card" | "primary" | "sky" | "coral" | "warning";
  className?: string;
}) {
  const tones: Record<string, string> = {
    card: "bg-card text-foreground",
    primary: "bg-primary text-primary-foreground",
    sky: "bg-sky text-sky-foreground",
    coral: "bg-coral text-coral-foreground",
    warning: "bg-warning text-warning-foreground",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border-2 border-border px-3 py-1 text-xs font-bold",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  className?: string;
}) {
  return (
    <div className={cn("mb-6 max-w-2xl", className)}>
      {eyebrow ? (
        <Chip tone="coral" className="mb-3">
          {eyebrow}
        </Chip>
      ) : null}
      <h2 className="font-display text-2xl leading-tight sm:text-4xl">{title}</h2>
      {description ? (
        <p className="mt-2 text-sm text-muted-foreground sm:text-base">{description}</p>
      ) : null}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  tone = "card",
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
  tone?: "card" | "primary" | "sky" | "coral" | "warning";
}) {
  return (
    <ClayCard tone={tone} className="p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-wide opacity-70">{label}</p>
        {icon ? <span className="shrink-0 opacity-80">{icon}</span> : null}
      </div>
      <p className="mt-1.5 font-display text-3xl leading-none">{value}</p>
      {hint ? <p className="mt-1 text-xs opacity-70">{hint}</p> : null}
    </ClayCard>
  );
}

/** Chunky bordered progress bar. */
export function ClayProgress({
  value,
  className,
  barClassName,
  label,
}: {
  value: number;
  className?: string;
  barClassName?: string;
  label?: string;
}) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div
      className={cn(
        "h-4 w-full overflow-hidden rounded-full border-2 border-border bg-muted",
        className,
      )}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div
        className={cn("h-full rounded-full bg-primary transition-[width] duration-700", barClassName)}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function ProgressRing({
  value,
  size = 96,
  children,
}: {
  value: number;
  size?: number;
  children?: ReactNode;
}) {
  const pct = Math.max(0, Math.min(100, value));
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--muted)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--primary)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (c * pct) / 100}
          style={{ transition: "stroke-dashoffset 800ms cubic-bezier(0.2,0.8,0.2,1)" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}
