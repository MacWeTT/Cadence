import { useTranslations } from 'next-intl';
import { CloserSwitch } from '@/app/(app)/circles/closer-switch/closer-switch';
import { MyPrefs } from '@/app/(app)/circles/my-prefs/my-prefs';
import { SharingSection } from '@/app/(app)/circles/sharing-section/sharing-section';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { CircleMemberView } from '@/server/circles-view';
import './sharing-dialog.css';

interface SharingDialogProps {
  circleId: string;
  /** You, for your own choices in this circle. */
  me: CircleMemberView;
  /** The other people in the circle. */
  others: CircleMemberView[];
  /** For a pair: whether Closer is on for both, and your partner's name. */
  pair: { closerActive: boolean; partner: string } | null;
  onClose: () => void;
}

/** "What I share here" in a window of its own: how much of each habit this circle sees, and your choices for the circle. */
export const SharingDialog = (props: SharingDialogProps) => {
  const { circleId, me, others, pair, onClose } = props;
  const { closer } = me;
  const { closerActive = false, partner = '' } = pair ?? {};

  const t = useTranslations('circles.sharing');

  const onOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
    }
  };

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sharing-dialog">
        <DialogHeader>
          <DialogTitle className="sharing-dialog__title">{t('title')}</DialogTitle>
          <DialogDescription>{t(pair ? 'introPair' : 'intro')}</DialogDescription>
        </DialogHeader>
        {pair && <CloserSwitch circleId={circleId} on={closer} active={closerActive} partner={partner} />}
        <MyPrefs circleId={circleId} member={me} />
        <SharingSection circleId={circleId} others={others} pair={pair !== null} closerOn={closer} />
      </DialogContent>
    </Dialog>
  );
};
