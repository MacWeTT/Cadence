import { Heart } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Scenery } from '@/components/scenery/scenery';
import { Button } from '@/components/ui/button';
import './pair-waiting.css';

interface PairWaitingProps {
  /** Only the person who started the pair can make the link. */
  isOwner: boolean;
  onInvite: () => void;
}

/** A pair whose partner has not joined yet: what to do next, in place of the conversation. */
export const PairWaiting = (props: PairWaitingProps) => {
  const { isOwner, onInvite } = props;

  const t = useTranslations('circles.pair');

  return (
    <div className="pair-waiting">
      <Scenery variant="scene" tone="pair" />
      <Heart aria-hidden="true" className="pair-waiting__heart" />
      <h2 className="pair-waiting__title">{t('waiting')}</h2>
      <p className="pair-waiting__text">{t('waitingText')}</p>
      {isOwner && <Button onClick={onInvite}>{t('waitingAction')}</Button>}
    </div>
  );
};
