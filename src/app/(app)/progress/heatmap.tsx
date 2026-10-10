import { formatCalendarDate } from "@/lib/format";
import type { HeatCell } from "@/server/progress-view";

const tooltip = (cell: HeatCell, single: boolean) => {
  const day = formatCalendarDate(cell.date, { weekday: "short", day: "numeric", month: "short" });
  if (single) return `${day}: ${cell.done ? "done" : "not done"}`;
  return `${day}: ${cell.done} of ${Math.max(cell.done, Math.round(cell.expected))} done`;
};

/**
 * The past year, one column per week. Squares have a fixed size. The grid is a picture for the eye (shades are not
 * the only record: the numbers are in the cards below, and each square names its day on hover).
 */
export function Heatmap({ weeks, single }: { weeks: HeatCell[][]; single: boolean }) {
  return (
    <div className="overflow-x-auto pb-1">
      <div role="img" aria-label="Activity over the past year" className="flex w-max gap-1">
        {weeks.map((week, i) => {
          const month = formatCalendarDate(week[0].date, { month: "short" });
          const showMonth = i === 0 || month !== formatCalendarDate(weeks[i - 1][0].date, { month: "short" });
          return (
            <div key={week[0].date} className="flex flex-col gap-1">
              <span className="h-4 whitespace-nowrap text-[10px] leading-4 text-ink-muted">{showMonth ? month : ""}</span>
              {week.map((cell) => (
                <div
                  key={cell.date}
                  title={cell.level === null ? undefined : tooltip(cell, single)}
                  className={`size-4 rounded-sm ${cell.level === null ? "bg-line/30" : ""}`}
                  style={cell.level === null ? undefined : { backgroundColor: `var(--heat-${cell.level})` }}
                />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
