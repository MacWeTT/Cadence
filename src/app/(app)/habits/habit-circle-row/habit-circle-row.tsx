import { useTranslations } from 'next-intl';
import { LevelSelect } from '@/app/(app)/circles/level-select/level-select';
import { useSetShare, useSharing } from '@/app/(app)/circles/use-sharing';
import type { Level } from '@/domain/circles';
import { circleTitle } from '@/lib/circle-people';
import type { CircleListItem } from '@/server/circles-view';
import './habit-circle-row.css';
import { WhyDisabled } from '@/components/why-disabled/why-disabled';

interface HabitCircleRowProps {
  habitId: string;
  circle: CircleListItem;
}

/** One circle in the habit dialog: its name, and how much of this habit it sees. The choice is saved as it is made. */
export const HabitCircleRow = (props: HabitCircleRowProps) => {
  const { habitId, circle } = props;
  const { id } = circle;

  const t = useTranslations('circles');
  const th = useTranslations('habits.dialog.circles');
  const tw = useTranslations('common.why');
  const { data } = useSharing(id);
  const share = useSetShare(id);

  const title = circleTitle(circle) ?? t('pair.waiting');
  const mine = data?.habits.find(habit => {
    return habit.id === habitId;
  });

  const onChange = (next: Level | 'inherit') => {
    if (next !== 'inherit') {
      share.mutate({ habitId, circleId: id, level: next });
    }
  };

  return (
    <li className="habit-circle-row">
      <span className="habit-circle-row__name">{title}</span>
      <WhyDisabled reason={!data ? tw('loading') : null}>
        <LevelSelect
          value={mine?.level ?? 'hidden'}
          disabled={!data}
          ariaLabel={th('levelFor', { name: title })}
          onChange={onChange}
        />
      </WhyDisabled>
    </li>
  );
};
