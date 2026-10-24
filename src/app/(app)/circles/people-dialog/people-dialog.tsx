import './people-dialog.css';
import { useTranslations } from 'next-intl';
import { MemberDetails } from '@/app/(app)/circles/member-details/member-details';
import { MemberRow } from '@/app/(app)/circles/member-row/member-row';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { CircleMemberView } from '@/server/circles-view';

interface PeopleDialogProps {
  name: string;
  members: CircleMemberView[];
  /** Only the person who started the circle can remove someone, and never themselves. */
  isOwner: boolean;
  onRemove: (member: CircleMemberView) => void;
  onClose: () => void;
}

/** Everyone in the circle, with what each shares with you. */
export const PeopleDialog = (props: PeopleDialogProps) => {
  const { name, members, isOwner, onRemove, onClose } = props;

  const t = useTranslations('circles.conversation');

  const onOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
    }
  };

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="people-dialog">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">{t('peopleTitle', { name })}</DialogTitle>
          <DialogDescription>{t('peopleText')}</DialogDescription>
        </DialogHeader>
        <ul>
          {members.map(member => {
            const { userId, isYou } = member;

            return (
              <MemberRow key={userId} member={member} canRemove={isOwner && !isYou} onRemove={onRemove}>
                <MemberDetails member={member} />
              </MemberRow>
            );
          })}
        </ul>
      </DialogContent>
    </Dialog>
  );
};
