/** The zone picker's data: real IANA zones from the browser's own list, shown as a city and a region. */

export interface ZoneLabel {
  city: string;
  region: string;
}

/** Browsers still report some zones by an old name (Intl says Asia/Calcutta for a person in India). */
const MODERN: Record<string, string> = {
  'Asia/Calcutta': 'Asia/Kolkata',
  'Asia/Katmandu': 'Asia/Kathmandu',
  'Asia/Rangoon': 'Asia/Yangon',
  'Asia/Saigon': 'Asia/Ho_Chi_Minh',
  'Europe/Kiev': 'Europe/Kyiv',
  'America/Godthab': 'America/Nuuk',
  'Atlantic/Faeroe': 'Atlantic/Faroe',
};

/** The current name of a zone, so a person in India sees Kolkata and a saved Asia/Calcutta still matches it. */
export const modernZone = (id: string): string => {
  return MODERN[id] ?? id;
};

let zones: string[] | null = null;

/** Every selectable zone by its current name, plus UTC (some runtimes leave it out of their list). Sorted by city. */
export const listZones = (): string[] => {
  zones ??= [...new Set([...Intl.supportedValuesOf('timeZone').map(modernZone), 'UTC'])].sort((a, b) => {
    return zoneLabel(a).city.localeCompare(zoneLabel(b).city);
  });

  return zones;
};

/** True for a listed zone, under its current or its old name. */
export const isKnownZone = (value: string): boolean => {
  return listZones().includes(modernZone(value));
};

/** "America/Los_Angeles" becomes the city "Los Angeles" in the region "America". A zone with no region is shown as written. */
export const zoneLabel = (id: string): ZoneLabel => {
  const parts = modernZone(id).split('/');
  const city = (parts.at(-1) ?? id).replaceAll('_', ' ');

  return { city, region: parts.length > 1 ? parts[0].replaceAll('_', ' ') : '' };
};

/** The UTC offset on a date, like "UTC+5:30" or "UTC−8" (a true minus sign), so daylight saving time is included. */
export const zoneOffset = (id: string, at: Date): string => {
  const part = new Intl.DateTimeFormat('en-US', { timeZone: id, timeZoneName: 'longOffset' })
    .formatToParts(at)
    .find(({ type }) => {
      return type === 'timeZoneName';
    });
  const match = /GMT([+−-])(\d{2}):(\d{2})/.exec(part?.value ?? '');

  if (!match) {
    return 'UTC+0';
  }

  const [, sign, hours, minutes] = match;
  const shown = `${Number(hours)}${minutes === '00' ? '' : `:${minutes}`}`;

  return `UTC${sign === '+' ? '+' : '−'}${shown}`;
};

const normalise = (value: string): string => {
  return value.toLowerCase().replaceAll('_', ' ').trim();
};

/** Zones whose city or region contains the search, a city that starts with it first. An empty search keeps them all. */
export const searchZones = (all: string[], query: string): string[] => {
  const needle = normalise(query);

  if (needle === '') {
    return all;
  }

  const hits = all.filter(id => {
    return normalise(id).includes(needle);
  });

  return [
    ...hits.filter(id => {
      return normalise(zoneLabel(id).city).startsWith(needle);
    }),
    ...hits.filter(id => {
      return !normalise(zoneLabel(id).city).startsWith(needle);
    }),
  ];
};
