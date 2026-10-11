import { version } from '@package';

/** Who builds Cadence, and where to reach them. */
export const DEVELOPER = { name: 'MacWeTT', url: 'https://github.com/MacWeTT' };

/**
 * The release, read from package.json itself, so the footer always shows the version in the file (see CHANGELOG.md).
 * Server components only: importing this from a client component would put all of package.json in the browser's bundle.
 */
export const VERSION = version;
