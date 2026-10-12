import { version } from '@package';
import { CONTRIBUTORS } from '@/lib/contributors';

/** Who builds Cadence, and where to reach them: the primary contributor. */
export const DEVELOPER = CONTRIBUTORS[0];

/**
 * The release, read from package.json itself, so the footer always shows the version in the file (see CHANGELOG.md).
 * Server components only: importing this from a client component would put all of package.json in the browser's bundle.
 */
export const VERSION = version;
