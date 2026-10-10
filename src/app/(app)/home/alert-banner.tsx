"use client";

import Link from "next/link";
import type { Alert, AlertTier } from "@/lib/alert";

const LOOK: Record<Exclude<AlertTier, "none">, { icon: string; box: string }> = {
  morning: { icon: "☀️", box: "border-line bg-surface" },
  afternoon: { icon: "⏳", box: "border-clay/30 bg-clay/10" },
  evening: { icon: "🔥", box: "border-clay/60 bg-clay/20" },
  late: { icon: "🚨", box: "border-clay bg-clay text-white" },
  done: { icon: "✅", box: "border-primary bg-primary/15" },
};

function focusHabit(id: string) {
  const checkbox = document.getElementById(`check-${id}`);
  checkbox?.scrollIntoView({ block: "center" });
  checkbox?.focus();
}

/**
 * The one message about how the day is going. `null` means the clock is not known yet: the space is held so the page
 * does not jump. The wrapper is a polite live region, so a change of tier is announced without interrupting.
 */
export function AlertBanner({ alert }: { alert: Alert | null }) {
  const look = alert && alert.tier !== "none" ? LOOK[alert.tier] : null;
  const action = alert?.action ?? null;
  return (
    <div role="status" aria-live="polite" className={alert === null ? "mt-6 h-13" : undefined}>
      {look && alert && (
        <div className={`mt-6 flex items-center gap-4 rounded-2xl border px-5 py-3 ${look.box}`}>
          <span aria-hidden className={`text-2xl ${alert.tier === "late" ? "motion-safe:animate-pulse" : ""}`}>
            {look.icon}
          </span>
          <p className="min-w-0 flex-1">{alert.message}</p>
          {action?.kind === "focus" && (
            <button
              type="button"
              onClick={() => focusHabit(action.id)}
              className="shrink-0 rounded-full border border-current px-4 py-1.5 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay"
            >
              {action.label}
            </button>
          )}
          {action?.kind === "link" && (
            <Link
              href={action.href}
              className="shrink-0 rounded-full border border-current px-4 py-1.5 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clay"
            >
              {action.label}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
