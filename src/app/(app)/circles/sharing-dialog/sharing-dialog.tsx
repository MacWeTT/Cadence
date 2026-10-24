import { useTranslations } from 'next-intl';
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
  onClose: () => void;
}

/** "What I share here" in a window of its own: how much of each habit this circle sees, and your choices for the circle. */
export const SharingDialog = (props: SharingDialogProps) => {
  const { circleId, me, others, onClose } = props;

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
          <DialogDescription>{t('intro')}</DialogDescription>
        </DialogHeader>
        <MyPrefs circleId={circleId} member={me} />
        <SharingSection circleId={circleId} others={others} />
      </DialogContent>
    </Dialog>
  );
};
