import { Button } from '@/components/ui/button';
import type { CalendarDate } from '@/domain/dates';
import { formatCalendarDate } from '@/lib/format';
import { ProgressRing } from '../progress-ring/progress-ring';
import './home-header.css';

interface HomeHeaderProps {
  done: number;
  total: number;
  today: CalendarDate;
  /** `null` until the browser clock is known; the space is held so the page does not jump. */
  greeting: string | null;
  onNewHabit: () => void;
}

/** The top of Home: the progress ring, the date, the greeting and the "New habit" button. */
export const HomeHeader = (props: HomeHeaderProps) => {
  const { done, total, today, greeting, onNewHabit } = props;

  return (
    <div className="home-header">
      <ProgressRing done={done} total={total} />
      <div className="home-header__titles">
        <p className="home-header__date">
          {formatCalendarDate(today, { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
        <h1 className="home-header__greeting">{greeting ?? ' '}</h1>
      </div>
      <Button className="home-header__button" onClick={onNewHabit}>
        New habit
      </Button>
    </div>
  );
};
