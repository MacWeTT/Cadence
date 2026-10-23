import { useTranslations } from 'next-intl';
import { LevelSelect } from '@/app/(app)/circles/level-select/level-select';
import { ConfirmModal } from '@/components/confirm-modal/confirm-modal';
import type { Label, Level } from '@/domain/circles';
import { memberName } from '@/lib/circle-people';
import type { SharedByMeView } from '@/server/circle-sharing-view';
import type { CircleMemberView } from '@/server/circles-view';
import './override-modal.css';

interface OverrideModalProps {
  habit: SharedByMeView;
  /** The other people in the circle. */
  members: CircleMemberView[];
  onChange: (habitId: string, viewerId: string, level: Level | 'inherit', label: Label) => void;
  onClose: () => void;
}

/** One habit, one row per other person: the circle's level, or their own. Changes apply at once. */
export const OverrideModal = (props: OverrideModalProps) => {
  const { habit, members, onChange, onClose } = props;
  const { id, name, overrides } = habit;

  const t = useTranslations('circles.sharing');

  return (
    <ConfirmModal
      title={t('overrideTitle', { name })}
      description={t('overrideText')}
      confirmLabel={t('done')}
      onConfirm={onClose}
      onClose={onClose}
    >
      <ul className="override-modal__list">
        {members.map(({ userId, tag, displayName }) => {
          const own = overrides.find(override => {
            return override.viewerId === userId;
          });
          const who = memberName(displayName, tag);

          const onLevelChange = (level: Level | 'inherit') => {
            onChange(id, userId, level, own?.label ?? 'generic');
          };

          return (
            <li key={userId} className="override-modal__row">
              <span className="override-modal__who">{who}</span>
              <LevelSelect
                value={own ? own.level : 'inherit'}
                allowInherit
                ariaLabel={t('overrideFor', { who })}
                onChange={onLevelChange}
              />
            </li>
          );
        })}
      </ul>
    </ConfirmModal>
  );
};
