"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { CalendarDate } from "@/domain/dates";
import { formatCalendarDate } from "@/lib/format";
import type { TodayView } from "@/server/today-view";
import { CheckSection } from "./check-row";
import { DateNav } from "./date-nav";
import { DayCard } from "./day-card";
import { useToggleCompletion } from "./use-toggle-completion";

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
  const { shown, saving, toggle } = useToggleCompletion(view, date);

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
                <CheckSection id="todo-heading" title="To do" rows={shown.todo} saving={saving} onToggle={toggle} />
                <CheckSection id="done-heading" title={isToday ? "Done today" : "Done"} rows={shown.done} saving={saving} onToggle={toggle} />
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
