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
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import './setting-modal.css';

interface SettingModalProps {
  title: string;
  saveDisabled?: boolean;
  /** Why Save is off, said in a tooltip on the button (a disabled button cannot be asked, so it sits on a wrapper). */
  saveDisabledReason?: string;
  onSave: () => void;
  onClose: () => void;
  children: React.ReactNode;
}

/** The frame every profile edit shares: a title, the control, and Cancel and Save. Save closes it; the row updates at once. */
export const SettingModal = (props: SettingModalProps) => {
  const { title, saveDisabled, saveDisabledReason, onSave, onClose, children } = props;

  const t = useTranslations('profile.modal');

  const onOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
    }
  };

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="setting-modal">
        <DialogHeader>
          <DialogTitle className="setting-modal__title">{title}</DialogTitle>
          <DialogDescription className="sr-only">{title}</DialogDescription>
        </DialogHeader>
        {children}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t('cancel')}
          </Button>
          {saveDisabled && saveDisabledReason ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <span tabIndex={0} className="setting-modal__save">
                  <Button disabled>{t('save')}</Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>{saveDisabledReason}</TooltipContent>
            </Tooltip>
          ) : (
            <Button onClick={onSave} disabled={saveDisabled}>
              {t('save')}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
