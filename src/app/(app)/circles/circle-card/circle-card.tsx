import { useTranslations } from 'next-intl';
import Link from 'next/link';
import type { CircleListItem } from '@/server/circles-view';
import './circle-card.css';

interface CircleCardProps {
  circle: CircleListItem;
}

/** One circle in the list: its name, how many people are in it, and whether you started it. */
export const CircleCard = (props: CircleCardProps) => {
  const { circle } = props;
  const { id, name, isOwner, memberCount } = circle;

  const t = useTranslations('circles');

  return (
    <li>
      <Link href={`/circles/${id}`} className="circle-card">
        <span className="circle-card__name">{name}</span>
        <span className="circle-card__meta">{t('people', { count: memberCount })}</span>
        {isOwner && <span className="circle-card__badge">{t('startedByYou')}</span>}
      </Link>
    </li>
  );
};
