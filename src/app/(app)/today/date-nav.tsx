import Link from "next/link";
import { addDays, type CalendarDate } from "@/domain/dates";

const arrow =
  "flex size-9 items-center justify-center rounded-md text-xl text-ink-muted focus-visible:outline-2 focus-visible:outline-clay";

/** Previous and next day, plus a way back to today. The viewed day lives in the URL, so back and reload just work. */
export function DateNav({ date, today, earliest }: { date: CalendarDate; today: CalendarDate; earliest: CalendarDate }) {
  const href = (d: CalendarDate) => (d === today ? "/today" : `/today?date=${d}`);
  return (
    <nav aria-label="Choose day" className="flex items-center gap-1">
      {date > earliest ? (
        <Link href={href(addDays(date, -1))} aria-label="Previous day" className={`${arrow} hover:bg-line hover:text-ink`}>
          <span aria-hidden>‹</span>
        </Link>
      ) : (
        <span role="link" aria-disabled="true" aria-label="Previous day" className={`${arrow} opacity-40`}>
          <span aria-hidden>‹</span>
        </span>
      )}
      {date < today ? (
        <Link href={href(addDays(date, 1))} aria-label="Next day" className={`${arrow} hover:bg-line hover:text-ink`}>
          <span aria-hidden>›</span>
        </Link>
      ) : (
        <span role="link" aria-disabled="true" aria-label="Next day" className={`${arrow} opacity-40`}>
          <span aria-hidden>›</span>
        </span>
      )}
      {date !== today && (
        <Link
          href="/today"
          className="ml-1 rounded-md border border-line px-3 py-1 text-sm hover:bg-line focus-visible:outline-2 focus-visible:outline-clay"
        >
          Today
        </Link>
      )}
    </nav>
  );
}
