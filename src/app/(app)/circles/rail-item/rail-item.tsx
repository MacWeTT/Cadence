import { Heart, Pin } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { circleColor, circleTitle } from '@/lib/circle-people';
import { habitColor } from '@/lib/palette';
import { cn } from '@/lib/utils';
import type { CircleListItem } from '@/server/circles-view';
import './rail-item.css';

interface RailItemProps {
  circle: CircleListItem;
  /** The circle that is open. */
  active: boolean;
}

/**
 * One circle in the list: a tile in its colour, its name, how many are in it, and a pin if pinned. A pair is listed
 * under the partner (or "Waiting for your partner") with a Partner mark.
 */
export const RailItem = (props: RailItemProps) => {
  const { circle, active } = props;
  const { id, memberCount, color, pinned, kind } = circle;

  const t = useTranslations('circles');

  const pair = kind === 'pair';
  const title = circleTitle(circle);
  const style = { '--circle-color': habitColor(circleColor(kind, color)) } as React.CSSProperties;

  return (
    <li>
      <Link
        href={`/circles/${id}`}
        aria-current={active ? 'page' : undefined}
        style={style}
        className={cn('rail-item', active && 'rail-item--active')}
      >
        <span aria-hidden="true" className="rail-item__tile">
          {pair || title === null ? <Heart className="rail-item__heart" /> : title.charAt(0).toUpperCase()}
        </span>
        <span className="rail-item__body">
          <span className="rail-item__name">{title ?? t('pair.waiting')}</span>
          <span className="rail-item__meta">{pair ? t('pair.label') : t('people', { count: memberCount })}</span>
        </span>
        {pinned && <Pin aria-label={t('pinned')} className="rail-item__pin" />}
      </Link>
    </li>
  );
};
