import { useTranslations } from 'next-intl';
import { useEffect, useRef } from 'react';
import { REACTIONS, type Reaction } from '@/domain/circles';
import type { FeedReaction } from '@/lib/circle-feed';
import { cn } from '@/lib/utils';
import './reaction-bar.css';
import { Tip } from '@/components/tip/tip';

interface ReactionBarProps {
  reactions: FeedReaction[];
  /** False when the friend is not taking reactions: what is there is shown, and nothing can be added. */
  enabled: boolean;
  /** The emoji picker is open (the message's own button opens it). */
  picking: boolean;
  onToggle: (emoji: Reaction, on: boolean) => void;
  /** An emoji was chosen from the picker, so it can close. */
  onPicked: () => void;
}

/** The emoji a day has got, as chips you can tap to add yours or take it back, and the picker for the other emoji. */
export const ReactionBar = (props: ReactionBarProps) => {
  const { reactions, enabled, picking, onToggle, onPicked } = props;

  const t = useTranslations('circles.conversation');
  const picker = useRef<HTMLDivElement>(null);

  // The picker opens under the last message, so bring it into view.
  useEffect(() => {
    if (picking) {
      picker.current?.scrollIntoView({ block: 'nearest' });
    }
  }, [picking]);

  const open = enabled && picking;

  if (reactions.length === 0 && !open) {
    return null;
  }

  return (
    <div className="reaction-bar">
      {reactions.map(({ emoji, count, mine, who }) => {
        const onChipClick = () => {
          onToggle(emoji, !mine);
        };

        return (
          <button
            key={emoji}
            type="button"
            disabled={!enabled}
            aria-pressed={mine}
            aria-label={t('reactionLabel', { emoji, count })}
            title={who
              .map(tag => {
                return `@${tag}`;
              })
              .join(', ')}
            onClick={onChipClick}
            className={cn('reaction-bar__chip', mine && 'reaction-bar__chip--mine')}
          >
            <span aria-hidden="true">{emoji}</span>
            <span aria-hidden="true">{count}</span>
          </button>
        );
      })}
      {open && (
        <div ref={picker} role="group" aria-label={t('pickReaction')} className="reaction-bar__picker">
          {REACTIONS.map(emoji => {
            const mine = reactions.some(({ emoji: given, mine: byMe }) => {
              return given === emoji && byMe;
            });

            const onPickEmoji = () => {
              onToggle(emoji, !mine);
              onPicked();
            };

            return (
              <Tip key={emoji} label={t('reactWith', { emoji })}>
                <button
                  type="button"
                  aria-label={t('reactWith', { emoji })}
                  aria-pressed={mine}
                  onClick={onPickEmoji}
                  className="reaction-bar__pick"
                >
                  {emoji}
                </button>
              </Tip>
            );
          })}
        </div>
      )}
    </div>
  );
};
