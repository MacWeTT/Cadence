export interface Contributor {
  name: string;
  /** Where to find them: their GitHub profile. */
  url: string;
}

/**
 * Everyone who has helped build Cadence, shown on the About page. The first is the primary contributor and the owner.
 * To be listed, add yourself at the end in your pull request (see the README).
 */
export const CONTRIBUTORS: Contributor[] = [
  { name: 'MacWeTT', url: 'https://github.com/MacWeTT' },
  { name: 'Aditya Kapoor', url: 'https://github.com/detoroito-sama' },
];
