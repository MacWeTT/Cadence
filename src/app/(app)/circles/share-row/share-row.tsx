import { useTranslations } from 'next-intl';
import { LevelSelect } from '@/app/(app)/circles/level-select/level-select';
import { Button } from '@/components/ui/button';
import { atLeast, isLabel, LABELS, type Label, type Level } from '@/domain/circles';
import type { SharedByMeView } from '@/server/circle-sharing-view';
import './share-row.css';

interface ShareRowProps {
  habit: SharedByMeView;
  /** Nobody to customise for when you are alone in the circle. */
  canCustomise: boolean;
  onLevel: (habitId: string, level: Level) => void;
  onLabel: (habitId: string, level: Level, label: Label) => void;
  onCustomise: (habit: SharedByMeView) => void;
}

/** One of your habits: how much of it this circle sees, how it is named to them, and a way to treat one person differently. */
export const ShareRow = (props: ShareRowProps) => {
  const { habit, canCustomise, onLevel, onLabel, onCustomise } = props;
  const { id, name, icon, level, label, overrides } = habit;
  const { length: customised } = overrides;

  const t = useTranslations('circles.sharing');

  const named = atLeast(level, 'done_today');

  const onLevelChange = (next: Level | 'inherit') => {
    if (next !== 'inherit') {
      onLevel(id, next);
    }
  };

  const onLabelChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const next = event.target.value;

    if (isLabel(next)) {
      onLabel(id, level, next);
    }
  };

  const onCustomiseClick = () => {
    onCustomise(habit);
  };

  return (
    <li className="share-row">
      <div className="share-row__habit">
        <span aria-hidden="true">{icon}</span>
        <span className="share-row__name">{name}</span>
      </div>
      <div className="share-row__controls">
        <LevelSelect value={level} ariaLabel={t('levelFor', { name })} onChange={onLevelChange} />
        {named && (
          <select className="level-select" value={label} aria-label={t('labelFor', { name })} onChange={onLabelChange}>
            {LABELS.map(option => {
              return (
                <option key={option} value={option}>
                  {t(`labels.${option}`)}
                </option>
              );
            })}
          </select>
        )}
        {canCustomise && (
          <Button
            variant="outline"
            size="sm"
            aria-label={customised > 0 ? t('customisedFor', { name, count: customised }) : t('customiseFor', { name })}
            onClick={onCustomiseClick}
          >
            {customised > 0 ? t('customised', { count: customised }) : t('customise')}
          </Button>
        )}
      </div>
      <p className="share-row__help">{t(`help.${level}`)}</p>
    </li>
  );
};
