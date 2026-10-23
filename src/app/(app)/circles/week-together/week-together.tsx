import { useTranslations } from 'next-intl';
import { Avatar } from '@/components/avatar/avatar';
import { avatarName, memberName, toAvatarView } from '@/lib/circle-people';
import { formatCalendarDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Together } from '@/lib/week-together';
import type { CircleMemberView } from '@/server/circles-view';
import './week-together.css';

interface WeekTogetherProps {
  together: Together;
  members: CircleMemberView[];
}

/**
 * The last seven days of a pair, a row for each of you: a filled dot for a day someone showed up, and, only where your
 * partner allowed it, a quiet dash for a day that didn't happen. Under it, one number for you both.
 */
export const WeekTogether = (props: WeekTogetherProps) => {
  const { together, members } = props;
  const { days, rows, both } = together;

  const t = useTranslations('circles.together');

  return (
    <section aria-label={t('title')} className="week-together">
      <div className="week-together__head">
        <h2 className="week-together__title">{t('title')}</h2>
        <p className="week-together__summary">{t('summary', { count: both })}</p>
      </div>
      <div className="week-together__grid">
        <span aria-hidden="true" />
        {days.map(date => {
          return (
            <span key={date} aria-hidden="true" className="week-together__day">
              {formatCalendarDate(date, { weekday: 'narrow' })}
            </span>
          );
        })}
        {rows.map(({ userId, isYou, days: cells }) => {
          const member = members.find(candidate => {
            return candidate.userId === userId;
          });
          const { displayName = null, tag = '', avatar } = member ?? {};
          const name = isYou ? t('you') : memberName(displayName, tag);
          const showed = cells.filter(cell => {
            return cell.showed;
          }).length;
          const off = cells.filter(cell => {
            return cell.off;
          }).length;

          return (
            <div
              key={userId}
              role="img"
              aria-label={t('rowLabel', { name, count: showed, off })}
              className="week-together__row"
            >
              <span className="week-together__who">
                {avatar && <Avatar avatar={toAvatarView(avatar)} name={avatarName(displayName, tag)} size="sm" />}
                <span className="week-together__name">{name}</span>
              </span>
              {cells.map(({ date, showed: did, off: wasOff }) => {
                return (
                  <span
                    key={date}
                    title={wasOff ? t('offMark') : undefined}
                    className={cn(
                      'week-together__cell',
                      did && 'week-together__cell--showed',
                      wasOff && 'week-together__cell--off',
                    )}
                  />
                );
              })}
            </div>
          );
        })}
      </div>
    </section>
  );
};
