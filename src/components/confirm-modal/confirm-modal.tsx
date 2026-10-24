'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import './confirm-modal.css';
import { WhyDisabled } from '@/components/why-disabled/why-disabled';

interface ConfirmModalProps {
  title: string;
  /** What is about to happen, in a sentence. */
  description: string;
  confirmLabel: string;
  /** A red confirm button, for something that cannot be undone. */
  destructive?: boolean;
  confirmDisabled?: boolean;
  /** Why the confirm button is off, said in a tooltip on it. */
  confirmDisabledReason?: string;
  onConfirm: () => void;
  onClose: () => void;
  children?: React.ReactNode;
}

/** A question with a warning: what will happen, an optional control, and Cancel and a confirm button. */
export const ConfirmModal = (props: ConfirmModalProps) => {
  const {
    title,
    description,
    confirmLabel,
    destructive,
    confirmDisabled,
    confirmDisabledReason,
    onConfirm,
    onClose,
    children,
  } = props;

  const t = useTranslations('profile.modal');

  const onOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
    }
  };

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="confirm-modal">
        <DialogHeader>
          <DialogTitle className="confirm-modal__title">{title}</DialogTitle>
          <DialogDescription className="confirm-modal__description">{description}</DialogDescription>
        </DialogHeader>
        {children}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t('cancel')}
          </Button>
          <WhyDisabled reason={confirmDisabled ? (confirmDisabledReason ?? null) : null}>
            <Button variant={destructive ? 'destructive' : 'default'} disabled={confirmDisabled} onClick={onConfirm}>
              {confirmLabel}
            </Button>
          </WhyDisabled>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
