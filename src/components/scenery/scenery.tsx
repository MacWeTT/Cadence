import { cn } from '@/lib/utils';
import './scenery.css';

interface SceneryProps {
  /** `backdrop` fills a panel from behind, `banner` is a strip, `scene` is a larger picture for an empty page. */
  variant: 'backdrop' | 'banner' | 'scene';
  /** `pair` swaps the greens for rose and the sprouts for hearts. */
  tone?: 'pair';
  className?: string;
}

const HILLS = {
  far: 'M0 150 C 90 110 170 120 260 138 S 430 160 520 128 S 700 96 800 126 L800 240 L0 240 Z',
  mid: 'M0 182 C 110 150 210 170 320 184 S 520 200 620 172 S 740 150 800 164 L800 240 L0 240 Z',
  near: 'M0 214 C 130 190 250 206 380 216 S 600 228 700 204 S 770 196 800 200 L800 240 L0 240 Z',
};
const PATH = 'M392 240 C 380 222 420 214 404 198 S 432 182 424 168';
const HEART = 'M0 -4 C -4 -12 -16 -8 -12 2 C -9 8 -2 12 0 15 C 2 12 9 8 12 2 C 16 -8 4 -12 0 -4 Z';
const SPROUTS = [
  { x: 70, y: 214 },
  { x: 168, y: 206 },
  { x: 560, y: 218 },
  { x: 700, y: 204 },
];

/**
 * Soft hills, a low sun and a winding path, drawn in the app's own colours at low contrast so a page feels warm
 * without anything competing with the content. It is decoration only, and follows the light and dark themes.
 */
export const Scenery = (props: SceneryProps) => {
  const { variant, tone, className } = props;
  const { far, mid, near } = HILLS;

  return (
    <svg
      aria-hidden
      viewBox="0 0 800 240"
      preserveAspectRatio="xMidYMax slice"
      className={cn('scenery', `scenery--${variant}`, tone && `scenery--${tone}`, className)}
    >
      <circle cx={640} cy={78} r={46} className="scenery__halo" />
      <circle cx={640} cy={78} r={26} className="scenery__sun" />
      <path d={far} className="scenery__hill scenery__hill--far" />
      <path d={mid} className="scenery__hill scenery__hill--mid" />
      <path d={near} className="scenery__hill scenery__hill--near" />
      <path d={PATH} className="scenery__path" />
      {SPROUTS.map(({ x, y }) => {
        return (
          <g key={x} transform={`translate(${x} ${y})`} className="scenery__sprout">
            {tone === 'pair' ? (
              <path d={HEART} className="scenery__heart" />
            ) : (
              <>
                <path d="M0 0 V-14" />
                <path d="M0 -8 C -8 -10 -10 -16 -9 -18 C -3 -18 0 -14 0 -8 Z" />
                <path d="M0 -11 C 8 -13 10 -19 9 -21 C 3 -21 0 -17 0 -11 Z" />
              </>
            )}
          </g>
        );
      })}
    </svg>
  );
};
