import type { CharacterId } from '@/lib/avatar';

const INK = '#3b2f24';
const PAPER = '#fff8e8';
const SKIN = '#f3d9b8';
const GOLD = '#e8b84a';

interface AvatarCharacterProps {
  id: CharacterId;
  /** The character's body colour. */
  color: string;
}

/** The drawing of each character, 64 by 64, in the body colour given. Plain shapes: any six SVGs would do. */
const drawing = (id: CharacterId, c: string): React.ReactNode => {
  switch (id) {
    case 'alien':
      return (
        <>
          <path d="M13 63c0-9 8-14 19-14s19 5 19 14z" fill={c} />
          <path d="M32 8C19 8 12 17 13 28c1 10 9 20 19 23 10-3 18-13 19-23C52 17 45 8 32 8z" fill={c} />
          <path d="M26 10 21 2M38 10l5-8" />
          <circle cx="21" cy="2.5" r="2.6" fill={GOLD} />
          <circle cx="43" cy="2.5" r="2.6" fill={GOLD} />
          <path d="M15 25c4-5 12-3 14 4-4 6-12 4-14-4zM49 25c-4-5-12-3-14 4 4 6 12 4 14-4z" fill={INK} />
          <circle cx="23" cy="27" r="1.8" fill={PAPER} stroke="none" />
          <circle cx="41" cy="27" r="1.8" fill={PAPER} stroke="none" />
          <circle cx="30.7" cy="39" r=".8" fill={INK} />
          <circle cx="33.3" cy="39" r=".8" fill={INK} />
          <path d="M28 44q4 2.5 8 0" />
        </>
      );
    case 'robot':
      return (
        <>
          <path d="M32 8v8" />
          <circle cx="32" cy="7" r="3" fill={c} />
          <rect x="14" y="16" width="36" height="34" rx="8" fill={c} />
          <rect x="8" y="28" width="6" height="12" rx="2" fill={c} />
          <rect x="50" y="28" width="6" height="12" rx="2" fill={c} />
          <rect x="21" y="26" width="8" height="8" fill={PAPER} />
          <rect x="35" y="26" width="8" height="8" fill={PAPER} />
          <path d="M22 43h20M27 43v4M32 43v4M37 43v4" />
        </>
      );
    case 'cyclops':
      return (
        <>
          <circle cx="32" cy="34" r="20" fill={c} />
          <path d="M18 20 14 8l10 8M46 20l4-12-10 8" fill={c} />
          <circle cx="32" cy="32" r="10" fill={PAPER} />
          <circle cx="34" cy="32" r="5" fill={INK} />
          <path d="M24 48q8 6 16 0" />
        </>
      );
    case 'ghost':
      return (
        <>
          <path d="M12 54V30a20 20 0 0 1 40 0v24l-7-5-6 5-7-5-7 5-6-5z" fill={c} />
          <ellipse cx="25" cy="30" rx="3.5" ry="5" fill={INK} />
          <ellipse cx="39" cy="30" rx="3.5" ry="5" fill={INK} />
          <ellipse cx="32" cy="42" rx="4" ry="5" fill={INK} />
        </>
      );
    case 'punk':
      return (
        <>
          <circle cx="32" cy="38" r="17" fill={c} />
          <path d="M22 24 24 8l4 14 4-18 4 18 4-14 2 16z" fill={c} />
          <rect x="18" y="32" width="28" height="8" rx="3" fill={INK} />
          <path d="M24 48q8 6 16 0" />
        </>
      );
    case 'mage':
      return (
        <>
          <path d="M10 63c0-8 9-12 22-12s22 4 22 12z" fill={c} />
          <path d="M21 42c-2 11 2 20 11 20s13-9 11-20z" fill="#f4efe6" />
          <ellipse cx="32" cy="40" rx="10" ry="9" fill={SKIN} />
          <path d="M15 33C22 30 24 16 33 6c2 8 4 14 16 27z" fill={c} />
          <path d="M33 6c4-3 8-1 8 3" />
          <path d="M8 34c8-4 40-4 48 0-6 5-42 5-48 0z" fill={c} />
          <path
            d="M32 18l1.8 3.8 4.2.5-3.1 2.9.8 4.1-3.7-2-3.7 2 .8-4.1-3.1-2.9 4.2-.5z"
            fill={GOLD}
            strokeWidth={1.2}
          />
          <circle cx="28" cy="41" r="1.5" fill={INK} stroke="none" />
          <circle cx="36" cy="41" r="1.5" fill={INK} stroke="none" />
          <path d="M24.5 37.5l4 1.2M39.5 37.5l-4 1.2" />
          <path d="M26 47q3-3.5 6-1 3-2.5 6 1-3 4-6 1.5-3 2.5-6-1.5z" fill="#fff" />
        </>
      );
  }
};

/** One of the six characters, drawn to fill its box with a little room round it so a round crop does not clip it. */
export const AvatarCharacter = (props: AvatarCharacterProps) => {
  const { id, color } = props;

  return (
    <svg
      aria-hidden
      viewBox="0 0 64 64"
      fill="none"
      stroke={INK}
      strokeWidth={2.2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="avatar-character"
    >
      <g transform="translate(32 34) scale(0.86) translate(-32 -32)">{drawing(id, color)}</g>
    </svg>
  );
};
