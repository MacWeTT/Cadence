import { AvatarCharacter } from '@/components/avatar-character/avatar-character';
import type { CharacterId } from '@/lib/avatar';
import { cn } from '@/lib/utils';
import type { AvatarView } from '@/server/profile-view';
import './avatar.css';

interface AvatarProps {
  avatar: AvatarView;
  /** Used for the initial when there is no picture. */
  name: string;
  size: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const FALLBACK_COLOR = '#5a6b3d';

/** The person's avatar: a picture (Google or their own photo), or a character or emoji on a tint of its colour. */
export const Avatar = (props: AvatarProps) => {
  const { avatar, name, size, className } = props;
  const { kind, value, color, url } = avatar;

  const base = color ?? FALLBACK_COLOR;
  const style = { '--avatar-color': base } as React.CSSProperties;

  let content: React.ReactNode = name.charAt(0).toUpperCase();

  if (url && (kind === 'google' || kind === 'photo')) {
    // eslint-disable-next-line @next/next/no-img-element -- a Google picture or a signed storage link; next/image needs host config
    content = <img src={url} alt="" referrerPolicy="no-referrer" className="avatar__image" />;
  } else if (kind === 'character' && value) {
    content = <AvatarCharacter id={value as CharacterId} color={base} />;
  } else if (kind === 'emoji' && value) {
    content = <span className="avatar__emoji">{value}</span>;
  }

  return (
    <span
      aria-hidden
      style={style}
      className={cn(
        'avatar',
        `avatar--${size}`,
        (kind === 'character' || kind === 'emoji') && 'avatar--tint',
        className,
      )}
    >
      {content}
    </span>
  );
};
