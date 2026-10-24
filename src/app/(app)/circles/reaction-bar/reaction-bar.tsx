import { SmilePlus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { REACTIONS, type Reaction } from '@/domain/circles';
import type { FeedReaction } from '@/lib/circle-feed';
import { cn } from '@/lib/utils';
import './reaction-bar.css';

interface ReactionBarProps {
  reactions: FeedReaction[];
  /** False when the friend is not taking reactions: what is there is shown, and nothing can be added. */
  enabled: boolean;
  onToggle: (emoji: Reaction, on: boolean) => void;
}

interface ReactionBarState {
  picking: boolean;
}

/** The emoji a day has got, as chips you can tap to add yours or take it back, and a button for the other emoji. */
export const ReactionBar = (props: ReactionBarProps) => {
  const { reactions, enabled, onToggle } = props;

  const [state, setState] = useState<ReactionBarState>({ picking: false });

  const t = useTranslations('circles.conversation');
  const picker = useRef<HTMLDivElement>(null);

  const { picking } = state;

  // The picker opens under the last message, so bring it into view.
  useEffect(() => {
    if (picking) {
      picker.current?.scrollIntoView({ block: 'nearest' });
    }
  }, [picking]);

  const onPickClick = () => {
    setState({ picking: !picking });
  };

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
      {enabled && (
        <button
          type="button"
          aria-label={t('addReaction')}
          aria-expanded={picking}
          onClick={onPickClick}
          className="reaction-bar__add"
        >
          <SmilePlus aria-hidden="true" className="reaction-bar__add-icon" />
        </button>
      )}
      {enabled && picking && (
        <div ref={picker} role="group" aria-label={t('pickReaction')} className="reaction-bar__picker">
          {REACTIONS.map(emoji => {
            const mine = reactions.some(({ emoji: given, mine: byMe }) => {
              return given === emoji && byMe;
            });

            const onPickEmoji = () => {
              onToggle(emoji, !mine);
              setState({ picking: false });
            };

            return (
              <button
                key={emoji}
                type="button"
                aria-label={t('reactWith', { emoji })}
                aria-pressed={mine}
                onClick={onPickEmoji}
                className="reaction-bar__pick"
              >
                {emoji}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
