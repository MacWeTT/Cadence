"use client";

import { useOptimistic, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import type { CalendarDate } from "@/domain/dates";
import { formatCalendarDate } from "@/lib/format";
import { GENERIC_SAVE_ERROR } from "@/server/completion-errors";
import { applyToggle, type TodayRow, type TodayView } from "@/server/today-view";
import { setCompletionAction } from "./actions";
import { CheckRow } from "./check-row";

export function TodayClient({ view, date }: { view: TodayView; date: CalendarDate; today: CalendarDate; earliest: CalendarDate }) {
  // The optimistic view reverts by itself when the transition ends: to the server's new view after a refresh, or to
  // the old one if the save failed.
  const [shown, showToggle] = useOptimistic(view, (current, change: { id: string; ticked: boolean }) =>
    applyToggle(current, change.id, change.ticked),
  );
  const [saving, setSaving] = useState<ReadonlySet<string>>(new Set());
  const inFlight = useRef(new Set<string>()); // a ref as well, so two taps in one render still send one request
  const [, startTransition] = useTransition();

  function toggle(row: TodayRow) {
    if (inFlight.current.has(row.id)) return;
    inFlight.current.add(row.id);
    setSaving(new Set(inFlight.current));
    const ticked = !row.ticked;
    startTransition(async () => {
      showToggle({ id: row.id, ticked });
      try {
        const result = await setCompletionAction(row.id, date, ticked);
        if (!result.ok) toast.error(result.error);
      } catch {
        toast.error(GENERIC_SAVE_ERROR);
      } finally {
        inFlight.current.delete(row.id);
        setSaving(new Set(inFlight.current));
      }
    });
  }

  const section = (id: string, title: string, rows: TodayRow[]) =>
    rows.length > 0 && (
      <section className="mt-8">
        <h2 id={id} className="mb-1 text-xs font-medium uppercase tracking-wider text-ink-muted">
          {title}
        </h2>
        <ul aria-labelledby={id}>
          {rows.map((row) => (
            <CheckRow key={row.id} row={row} disabled={saving.has(row.id)} onToggle={() => toggle(row)} />
          ))}
        </ul>
      </section>
    );

  return (
    <>
      <p className="text-sm text-ink-muted">{formatCalendarDate(date, { weekday: "long", day: "numeric", month: "long" })}</p>
      <h1 className="font-display text-4xl">Today</h1>
      {section("todo-heading", "To do", shown.todo)}
      {section("done-heading", "Done today", shown.done)}
    </>
  );
}
