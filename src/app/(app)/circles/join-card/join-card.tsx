'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useJoinCircle } from '@/app/(app)/circles/use-circles';
import { Button } from '@/components/ui/button';
import { memberName } from '@/lib/circle-people';
import type { InvitePreview } from '@/server/circles-view';
import './join-card.css';
import { WhyDisabled } from '@/components/why-disabled/why-disabled';

interface JoinCardProps {
  token: string;
  preview: InvitePreview;
}

/** "Join this circle?": its name, who is in it, and Join or No thanks. */
export const JoinCard = (props: JoinCardProps) => {
  const { token, preview } = props;
  const { name, kind, full, members } = preview;
  const [first] = members;
  const { display_name: firstName = null, tag: firstTag = '' } = first ?? {};
  const pair = kind === 'pair';

  const t = useTranslations('circles.join');
  const tw = useTranslations('common.why');
  const router = useRouter();
  const join = useJoinCircle();
  const { isPending: joining } = join;

  const onJoinClick = () => {
    join.mutate(token, {
      onSuccess: id => {
        router.push(`/circles/${id}`);
      },
    });
  };

  const onDeclineClick = () => {
    router.push('/circles');
  };

  return (
    <section aria-labelledby="join-title" className="join-card">
      <h1 id="join-title" className="join-card__title">
        {pair && first ? t('pairTitle', { name: memberName(firstName, firstTag) }) : t('title', { name })}
      </h1>
      <p className="join-card__text">{pair ? t('pairText') : t('text', { count: members.length })}</p>
      <ul aria-label={t('peopleLabel')} className="join-card__people">
        {members.map(({ tag, display_name }) => {
          return (
            <li key={tag} className="join-card__person">
              {memberName(display_name, tag)}
            </li>
          );
        })}
      </ul>
      {full && <p className="join-card__full">{t('full')}</p>}
      <div className="join-card__actions">
        <WhyDisabled reason={full ? t('full') : joining ? tw('busy') : null}>
          <Button disabled={full || joining} onClick={onJoinClick}>
            {t('join')}
          </Button>
        </WhyDisabled>
        <Button variant="outline" onClick={onDeclineClick}>
          {t('decline')}
        </Button>
      </div>
    </section>
  );
};
