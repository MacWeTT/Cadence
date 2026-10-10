"use client";

import Link from "next/link";
import { useEffect, useOptimistic, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { CalendarDate } from "@/domain/dates";
import { formatCalendarDate } from "@/lib/format";
import { GENERIC_SAVE_ERROR } from "@/server/completion-errors";
import { applyToggle, type TodayRow, type TodayView } from "@/server/today-view";
import { setCompletionAction } from "./actions";
import { CheckRow } from "./check-row";
import { DateNav } from "./date-nav";
import { DayCard } from "./day-card";

export function TodayClient({
  view,
  date,
  today,
  earliest,
}: {
  view: TodayView;
  date: CalendarDate;
  today: CalendarDate;
  earliest: CalendarDate;
}) {
  const isToday = date === today;
  // The optimistic view reverts by itself when the transition ends: to the server's new view after a refresh, or to
  // the old one if the save failed.
  const [shown, showToggle] = useOptimistic(view, (current, change: { id: string; ticked: boolean }) =>
    applyToggle(current, change.id, change.ticked),
  );
  const [saving, setSaving] = useState<ReadonlySet<string>>(new Set());
  const inFlight = useRef(new Set<string>()); // a ref as well, so two taps in one render still send one request
  const [, startTransition] = useTransition();
  const focusId = useRef<string | null>(null);

  // A ticked row moves to the other list, which remounts its button and drops keyboard focus; put it back.
  useEffect(() => {
    if (focusId.current && document.activeElement === document.body) {
      document.getElementById(`check-${focusId.current}`)?.focus();
    }
  });

  function toggle(row: TodayRow) {
    if (inFlight.current.has(row.id)) return;
    inFlight.current.add(row.id);
    focusId.current = row.id;
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

  const nothingListed = shown.todo.length === 0 && shown.done.length === 0;

  return (
    <>
      <div className="flex items-end justify-between gap-4">
        <div>
          {isToday && <p className="text-sm text-ink-muted">{formatCalendarDate(date, { weekday: "long", day: "numeric", month: "long" })}</p>}
          <h1 className="font-display text-4xl">
            {isToday ? "Today" : formatCalendarDate(date, { weekday: "long", day: "numeric", month: "short" })}
          </h1>
        </div>
        <DateNav date={date} today={today} earliest={earliest} />
      </div>

      {!view.hasHabits ? (
        <div className="mt-8 rounded-2xl border border-line bg-surface px-6 py-14 text-center">
          <h2 className="font-display text-2xl">No habits yet</h2>
          <p className="mx-auto mb-6 mt-2 max-w-sm text-ink-muted">Create a habit and it will show up here, ready to tick off.</p>
          <Button asChild>
            <Link href="/habits">Create your first habit</Link>
          </Button>
        </div>
      ) : (
        <div className="grid items-start gap-x-10 lg:grid-cols-[1fr_18rem]">
          <div className="min-w-0">
            {nothingListed ? (
              <p className="mt-8 text-ink-muted">No habits on this day.</p>
            ) : (
              <>
                {shown.todo.length === 0 && (
                  <p className="mt-8 text-ink-muted">{isToday ? "Nothing left for today." : "Nothing left for this day."}</p>
                )}
                {section("todo-heading", "To do", shown.todo)}
                {section("done-heading", isToday ? "Done today" : "Done", shown.done)}
              </>
            )}
          </div>
          <div className="order-first mt-8 lg:order-last">
            <DayCard done={shown.done.length} total={shown.done.length + shown.todo.length} strip={shown.strip} date={date} today={today} />
          </div>
        </div>
      )}

    </>
  );
}
