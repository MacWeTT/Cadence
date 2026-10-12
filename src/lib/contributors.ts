/**
 * The GitHub usernames of everyone who has helped build Cadence, shown on the About page (no real names). The first is the
 * primary contributor and the owner. To be listed, add your username at the end in your pull request (see the README).
 */
export const CONTRIBUTORS: string[] = ['MacWeTT', 'detoroito-sama'];

/** Where a contributor is found: their GitHub page. */
export const githubUrl = (username: string): string => {
  return `https://github.com/${username}`;
};
