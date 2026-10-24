import { useTranslations } from 'next-intl';
import { useSetPrefs } from '@/app/(app)/circles/use-circle-social';
import type { CircleMemberView } from '@/server/circles-view';
import './my-prefs.css';

interface MyPrefsProps {
  circleId: string;
  member: CircleMemberView;
}

/** The two choices that are about you in this circle: whether your week counts, and whether friends can react to you. */
export const MyPrefs = (props: MyPrefsProps) => {
  const { circleId, member } = props;
  const { inWeek, allowCheers } = member;

  const t = useTranslations('circles.member');
  const setPrefs = useSetPrefs(circleId);

  const onInWeekChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPrefs.mutate({ circleId, inWeek: event.target.checked, allowCheers });
  };

  const onAllowCheersChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setPrefs.mutate({ circleId, inWeek, allowCheers: event.target.checked });
  };

  return (
    <div className="my-prefs">
      <label className="my-prefs__option">
        <input type="checkbox" checked={inWeek} onChange={onInWeekChange} />
        <span>{t('countMyWeek')}</span>
      </label>
      <label className="my-prefs__option">
        <input type="checkbox" checked={allowCheers} onChange={onAllowCheersChange} />
        <span>{t('letFriendsCheer')}</span>
      </label>
    </div>
  );
};
