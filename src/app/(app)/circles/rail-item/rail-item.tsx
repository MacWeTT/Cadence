import { Pin } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { habitColor } from '@/lib/palette';
import { cn } from '@/lib/utils';
import type { CircleListItem } from '@/server/circles-view';
import './rail-item.css';

interface RailItemProps {
  circle: CircleListItem;
  /** The circle that is open. */
  active: boolean;
}

/** One circle in the list: a tile in its colour with its first letter, its name, how many are in it, and a pin if pinned. */
export const RailItem = (props: RailItemProps) => {
  const { circle, active } = props;
  const { id, name, memberCount, color, pinned } = circle;

  const t = useTranslations('circles');

  const style = { '--circle-color': habitColor(color) } as React.CSSProperties;

  return (
    <li>
      <Link
        href={`/circles/${id}`}
        aria-current={active ? 'page' : undefined}
        style={style}
        className={cn('rail-item', active && 'rail-item--active')}
      >
        <span aria-hidden="true" className="rail-item__tile">
          {name.charAt(0).toUpperCase()}
        </span>
        <span className="rail-item__body">
          <span className="rail-item__name">{name}</span>
          <span className="rail-item__meta">{t('people', { count: memberCount })}</span>
        </span>
        {pinned && <Pin aria-label={t('pinned')} className="rail-item__pin" />}
      </Link>
    </li>
  );
};
