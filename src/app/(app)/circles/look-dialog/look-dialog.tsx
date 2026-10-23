import { Pin } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useSetLook } from '@/app/(app)/circles/use-circle-social';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CIRCLE_COLORS, type CircleColor } from '@/domain/circles';
import { habitColor } from '@/lib/palette';
import { cn } from '@/lib/utils';
import './look-dialog.css';

interface LookDialogProps {
  circleId: string;
  color: CircleColor;
  pinned: boolean;
  isOwner: boolean;
  onLeave: () => void;
  onCloseCircle: () => void;
  onClose: () => void;
}

/** Circle settings: your own colour and pin for it (friends never see them), and the ways out: leave, or close it. */
export const LookDialog = (props: LookDialogProps) => {
  const { circleId, color, pinned, isOwner, onLeave, onCloseCircle, onClose } = props;

  const t = useTranslations('circles.look');
  const setLook = useSetLook(circleId);

  const onOpenChange = (open: boolean) => {
    if (!open) {
      onClose();
    }
  };

  const onPinChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setLook.mutate({ circleId, color, pinned: event.target.checked });
  };

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="look-dialog">
        <DialogHeader>
          <DialogTitle className="look-dialog__title">{t('title')}</DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>
        <div role="radiogroup" aria-label={t('color')} className="look-dialog__swatches">
          {CIRCLE_COLORS.map(key => {
            const selected = key === color;
            const style = { '--swatch': habitColor(key) } as React.CSSProperties;

            const onSwatchClick = () => {
              setLook.mutate({ circleId, color: key, pinned });
            };

            return (
              <button
                key={key}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={t(`colors.${key}`)}
                title={t(`colors.${key}`)}
                style={style}
                onClick={onSwatchClick}
                className={cn('look-dialog__swatch', selected && 'look-dialog__swatch--selected')}
              />
            );
          })}
        </div>
        <label className="look-dialog__pin">
          <input type="checkbox" role="switch" checked={pinned} onChange={onPinChange} />
          <span>
            <span className="look-dialog__pin-title">
              <Pin aria-hidden="true" className="look-dialog__pin-icon" />
              {t('pin')}
            </span>
            <span className="look-dialog__pin-text">{t('pinText')}</span>
          </span>
        </label>
        <div className="look-dialog__exits">
          <Button variant="outline" onClick={onLeave}>
            {t('leave')}
          </Button>
          {isOwner && (
            <Button variant="outline" onClick={onCloseCircle}>
              {t('close')}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
