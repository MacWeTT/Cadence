import type { WeekStart } from "@/domain/dates";
import { weekEnd, type CalendarDate } from "@/domain/dates";
import { formatCalendarDate } from "@/lib/format";
import { habitColor } from "@/lib/palette";
import { streakLength } from "@/lib/today-labels";
import type { AtRiskRow } from "@/server/home-view";

function tag(row: AtRiskRow, today: CalendarDate, weekStartsOn: WeekStart) {
  if (row.needed === null) return `${streakLength(row.streak)} · ends at midnight`;
  const last = formatCalendarDate(weekEnd(today, weekStartsOn), { weekday: "long" });
  return `${streakLength(row.streak)} · ${row.needed} more by ${last}`;
}

/** Streaks that will break if nothing more is ticked in time. */
export function StreaksCard({ rows, today, weekStartsOn }: { rows: AtRiskRow[]; today: CalendarDate; weekStartsOn: WeekStart }) {
  return (
    <section aria-labelledby="streaks-heading" className="rounded-2xl border border-line bg-surface p-5">
      <h2 id="streaks-heading" className="mb-3 text-xs font-medium uppercase tracking-wider text-ink-muted">
        Streaks to protect
      </h2>
      {rows.length === 0 ? (
        <p className="text-sm text-ink-muted">No streaks at risk right now.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((row) => (
            <li key={row.id} className="flex items-center gap-3 rounded-xl border border-clay/50 bg-clay/10 px-3 py-2.5">
              <span
                aria-hidden
                className="flex size-8 shrink-0 items-center justify-center rounded-lg text-lg"
                style={{ backgroundColor: `color-mix(in oklab, ${habitColor(row.color)} 22%, var(--surface))` }}
              >
                {row.icon}
              </span>
              <div className="min-w-0">
                <p className="truncate font-semibold">{row.name}</p>
                <p className="text-sm text-ink-muted">{tag(row, today, weekStartsOn)}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
