'use client';

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
import { deleteHabitAction } from './actions';

export function DeleteHabitDialog({
  habit,
  onClose,
  onCloseAutoFocus,
}: {
  habit: HabitListItem;
  onClose: () => void;
  onCloseAutoFocus: (event: Event) => void;
}) {
  const [busy, setBusy] = useState(false);
  const deleting = useRef(false);

  async function confirm() {
    if (deleting.current) return;
    deleting.current = true;
    setBusy(true);
    const result = await deleteHabitAction(habit.id);
    if (result.ok) {
      toast.success('Habit deleted');
      onClose();
      return;
    }
    toast.error(result.error);
    deleting.current = false;
    setBusy(false);
  }

  return (
    <AlertDialog open onOpenChange={open => !open && onClose()}>
      <AlertDialogContent onCloseAutoFocus={onCloseAutoFocus}>
        <AlertDialogHeader>
          <AlertDialogTitle>{`Delete ${habit.name}?`}</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently removes the habit and all of its history. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            disabled={busy}
            onClick={e => {
              e.preventDefault(); // keep the dialog open until the server has answered
              void confirm();
            }}
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
