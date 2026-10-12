/**
 * A tag is @name: 3 to 30 lowercase letters, digits and underscores, unique whatever the case. The database checks the same
 * rules (`valid_tag()` in the tags migration) and has the last word; this list must match its reserved words.
 */
export const TAG_MIN = 3;
export const TAG_MAX = 30;

const TAG_PATTERN = new RegExp(`^[a-z0-9_]{${TAG_MIN},${TAG_MAX}}$`);

export const RESERVED_TAGS = [
  'admin',
  'cadence',
  'support',
  'help',
  'me',
  'root',
  'system',
  'staff',
  'official',
  'null',
  'undefined',
] as const;

export const isValidTag = (tag: string): boolean => {
  return TAG_PATTERN.test(tag) && !(RESERVED_TAGS as readonly string[]).includes(tag);
};

/** What a person typed as a tag: without the @ and the spaces around it, in lowercase. */
export const normaliseTag = (input: string): string => {
  return input.trim().replace(/^@+/, '').toLowerCase();
};
