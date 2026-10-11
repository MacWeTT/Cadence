'use client';

import { useTranslations } from 'next-intl';
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
import { useDeleteHabit } from '@/app/(app)/habits/use-habits';

interface DeleteHabitDialogProps {
  habit: HabitListItem;
  onClose: () => void;
  onCloseAutoFocus: (event: Event) => void;
}

export const DeleteHabitDialog = (props: DeleteHabitDialogProps) => {
  const { habit, onClose, onCloseAutoFocus } = props;

  const t = useTranslations('habits');
  const ta = useTranslations('common.actions');
  const remove = useDeleteHabit();

  const { id, name } = habit;

  const onOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
    }
  };

  // The habit leaves the list at once; if the server refuses, it comes back and a toast says why.
  const onConfirmClick = () => {
    remove.mutate(id);
    onClose();
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
          <AlertDialogAction onClick={onConfirmClick}>{ta('delete')}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
