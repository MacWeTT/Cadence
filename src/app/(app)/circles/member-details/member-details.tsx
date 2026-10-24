import { useTranslations } from 'next-intl';
import { SharedHabit } from '@/app/(app)/circles/shared-habit/shared-habit';
import type { CircleMemberView } from '@/server/circles-view';
import './member-details.css';

interface MemberDetailsProps {
  member: CircleMemberView;
}

/** Under a friend's name in the people list: whether they showed up this week and what they share with you. */
export const MemberDetails = (props: MemberDetailsProps) => {
  const { member } = props;
  const { isYou, paused, today, showedUpWeek, habits } = member;

  const t = useTranslations('circles.member');

  if (isYou) {
    return null;
  }

  if (paused) {
    return <p className="member-details__quiet">{t('paused')}</p>;
  }

  return (
    <div className="member-details">
      {showedUpWeek && <p className="member-details__week">{t('showedUpWeek')}</p>}
      {habits.length > 0 ? (
        <ul>
          {habits.map((habit, index) => {
            return <SharedHabit key={index} habit={habit} today={today} />;
          })}
        </ul>
      ) : (
        <p className="member-details__quiet">{t('nothingShared')}</p>
      )}
    </div>
  );
};
