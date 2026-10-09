import { habitColor } from "@/lib/palette";
import { scheduleLabel } from "@/lib/schedule-label";
import type { HabitListItem } from "@/server/habit-view";

export function HabitRow({ habit }: { habit: HabitListItem }) {
  return (
    <li className="flex items-center gap-4 border-b border-line px-3 py-4">
      <span
        aria-hidden
        className="flex size-11 shrink-0 items-center justify-center rounded-xl text-2xl"
        style={{ backgroundColor: `color-mix(in oklab, ${habitColor(habit.color)} 22%, var(--surface))` }}
      >
        {habit.icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{habit.name}</p>
        {habit.description && <p className="truncate text-sm text-ink-muted">{habit.description}</p>}
      </div>
      <span className="rounded-full border border-line px-3 py-0.5 text-sm text-ink-muted">
        {scheduleLabel(habit.schedule)}
      </span>
    </li>
  );
}
