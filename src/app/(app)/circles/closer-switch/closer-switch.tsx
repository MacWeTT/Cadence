import { useTranslations } from 'next-intl';
import { useSetCloser } from '@/app/(app)/circles/use-circle-social';
import { haptic } from '@/lib/haptics';
import './closer-switch.css';

interface CloserSwitchProps {
  circleId: string;
  /** Your own switch. */
  on: boolean;
  /** Whether it is on for both of you. */
  active: boolean;
  /** Your partner's name, for the line that says whose turn it is. */
  partner: string;
}

/** Closer: let each other see off days. Two switches, one each, and it counts only when both are on. */
export const CloserSwitch = (props: CloserSwitchProps) => {
  const { circleId, on, active, partner } = props;

  const t = useTranslations('circles.closer');
  const setCloser = useSetCloser(circleId);

  const onChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { checked } = event.target;

    if (checked) {
      haptic('toggle');
    }

    setCloser.mutate({ circleId, on: checked });
  };

  const status = active ? t('active') : on ? t('waitingFor', { name: partner }) : t('off');

  return (
    <label className="closer-switch">
      <input type="checkbox" role="switch" checked={on} onChange={onChange} />
      <span>
        <span className="closer-switch__title">{t('label')}</span>
        <span className="closer-switch__text">{t('text')}</span>
        <span className="closer-switch__status">{status}</span>
      </span>
    </label>
  );
};
