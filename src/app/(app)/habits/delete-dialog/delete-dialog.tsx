'use client';

import { useTranslations } from 'next-intl';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { HabitListItem } from '@/server/habit-view';
import { deleteHabitAction } from '@/app/(app)/habits/actions';

interface DeleteHabitDialogProps {
  habit: HabitListItem;
  onClose: () => void;
  onCloseAutoFocus: (event: Event) => void;
}

export const DeleteHabitDialog = (props: DeleteHabitDialogProps) => {
  const { habit, onClose, onCloseAutoFocus } = props;

  const [busy, setBusy] = useState(false);

  const t = useTranslations('habits');
  const ta = useTranslations('common.actions');
  const deleting = useRef(false);

  const { id, name } = habit;

  const confirm = async () => {
    if (deleting.current) {
      return;
    }

    deleting.current = true;
    setBusy(true);
    const result = await deleteHabitAction(id);

    if (result.ok) {
      toast.success(t('toasts.deleted'));
      onClose();

      return;
    }

    toast.error(result.error);
    deleting.current = false;
    setBusy(false);
  };

  const onOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
    }
  };

  // Keep the dialog open until the server has answered.
  const onConfirmClick = (event: React.MouseEvent) => {
    event.preventDefault();
    void confirm();
  };

  return (
    <AlertDialog open onOpenChange={onOpenChange}>
      <AlertDialogContent onCloseAutoFocus={onCloseAutoFocus}>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('delete.title', { name })}</AlertDialogTitle>
          <AlertDialogDescription>{t('delete.description')}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{ta('cancel')}</AlertDialogCancel>
          <AlertDialogAction disabled={busy} onClick={onConfirmClick}>
            {ta('delete')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
