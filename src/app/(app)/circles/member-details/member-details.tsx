import { useTranslations } from 'next-intl';
import { MyPrefs } from '@/app/(app)/circles/my-prefs/my-prefs';
import { SharedHabit } from '@/app/(app)/circles/shared-habit/shared-habit';
import { useCheer } from '@/app/(app)/circles/use-circle-social';
import { Button } from '@/components/ui/button';
import { memberName } from '@/lib/circle-people';
import type { CircleMemberView } from '@/server/circles-view';
import './member-details.css';

interface MemberDetailsProps {
  circleId: string;
  member: CircleMemberView;
}

/** Under a person's name: what they share with you and a cheer button, or, on your own card, who cheered you and your choices. */
export const MemberDetails = (props: MemberDetailsProps) => {
  const { circleId, member } = props;
  const { userId, tag, displayName, isYou, paused, today, showedUpWeek, habits, allowCheers, cheeredByYou } = member;

  const t = useTranslations('circles.member');
  const cheer = useCheer(circleId);

  const who = memberName(displayName, tag);

  const onCheerClick = () => {
    cheer.mutate({ circleId, toUser: userId, forDate: today });
  };

  if (isYou) {
    return <MyPrefs circleId={circleId} member={member} />;
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
      {allowCheers &&
        (cheeredByYou ? (
          <p className="member-details__quiet">{t('cheered')}</p>
        ) : (
          <Button variant="outline" size="sm" aria-label={t('cheerLabel', { who })} onClick={onCheerClick}>
            {t('cheer')}
          </Button>
        ))}
    </div>
  );
};
