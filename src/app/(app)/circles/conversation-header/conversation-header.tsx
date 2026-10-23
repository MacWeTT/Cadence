import { ChevronLeft, Heart, Settings } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { Fragment } from 'react';
import { Avatar } from '@/components/avatar/avatar';
import { Button } from '@/components/ui/button';
import { avatarName, toAvatarView } from '@/lib/circle-people';
import { habitColor } from '@/lib/palette';
import { cn } from '@/lib/utils';
import type { CircleView } from '@/server/circles-view';
import './conversation-header.css';

const STACK = 4;

interface ConversationHeaderProps {
  circle: CircleView;
  /** The name of the circle, or the partner for a pair. */
  title: string;
  /** The line under the name. */
  subtitle: string;
  /** The owner of a group, or of a pair that is still waiting. */
  canInvite: boolean;
  onInvite: () => void;
  onShare: () => void;
  onSettings: () => void;
  onPeople: () => void;
}

/** The top of a circle: back (on a phone), its colour tile and name, the people, and the buttons. */
export const ConversationHeader = (props: ConversationHeaderProps) => {
  const { circle, title, subtitle, canInvite, onInvite, onShare, onSettings, onPeople } = props;
  const { color, members, kind } = circle;
  const pair = kind === 'pair';
  const { length: count } = members;
  const stacked = [...members].slice(0, STACK);

  const t = useTranslations('circles');

  const style = { '--circle-color': habitColor(color) } as React.CSSProperties;

  return (
    <header style={style} className="conversation-header">
      <Link href="/circles" className="conversation-header__back">
        <ChevronLeft aria-hidden="true" className="conversation-header__back-icon" />
        {t('circle.back')}
      </Link>
      <div className="conversation-header__row">
        <span aria-hidden="true" className="conversation-header__tile">
          {pair ? <Heart className="conversation-header__heart" /> : title.replace(/^@/, '').charAt(0).toUpperCase()}
        </span>
        <div className="conversation-header__titles">
          <h1 className="conversation-header__title">{title}</h1>
          <p className="conversation-header__week">{subtitle}</p>
        </div>
      </div>
      <div className="conversation-header__actions">
        <button
          type="button"
          aria-label={t('conversation.peopleLabel', { count })}
          onClick={onPeople}
          className="conversation-header__people"
        >
          <span className={cn('conversation-header__stack', pair && 'conversation-header__stack--pair')}>
            {stacked.map(({ userId, displayName, tag, avatar }, index) => {
              return (
                <Fragment key={userId}>
                  {pair && index === 1 && <Heart aria-hidden="true" className="conversation-header__between" />}
                  <Avatar
                    avatar={toAvatarView(avatar)}
                    name={avatarName(displayName, tag)}
                    size="sm"
                    className="conversation-header__avatar"
                  />
                </Fragment>
              );
            })}
          </span>
          <span className="conversation-header__count">{t('conversation.people', { count })}</span>
        </button>
        {canInvite && (
          <Button variant="outline" size="sm" onClick={onInvite}>
            {t('circle.invite')}
          </Button>
        )}
        <Button size="sm" onClick={onShare}>
          {t('conversation.share')}
        </Button>
        <Button variant="outline" size="icon-sm" aria-label={t('conversation.settings')} onClick={onSettings}>
          <Settings aria-hidden="true" />
        </Button>
      </div>
    </header>
  );
};
