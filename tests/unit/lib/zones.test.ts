import { describe, expect, it } from 'vitest';
import { isKnownZone, listZones, modernZone, searchZones, zoneLabel, zoneOffset } from '@/lib/zones';

const WINTER = new Date('2026-01-15T12:00:00Z');

describe('zoneLabel', () => {
  it('shows the city with spaces and the region beside it', () => {
    expect(zoneLabel('America/Los_Angeles')).toEqual({ city: 'Los Angeles', region: 'America' });
    expect(zoneLabel('Asia/Kolkata')).toEqual({ city: 'Kolkata', region: 'Asia' });
  });

  it('uses the last part as the city for a nested zone', () => {
    expect(zoneLabel('America/Argentina/Buenos_Aires')).toEqual({ city: 'Buenos Aires', region: 'America' });
  });

  it('shows a zone without a region as written', () => {
    expect(zoneLabel('UTC')).toEqual({ city: 'UTC', region: '' });
  });

  it('never leaves an underscore in what is shown', () => {
    for (const id of listZones()) {
      const { city, region } = zoneLabel(id);

      expect(`${city}${region}`).not.toContain('_');
    }
  });
});

describe('modernZone', () => {
  it('turns the old names a browser still reports into the current ones', () => {
    expect(modernZone('Asia/Calcutta')).toBe('Asia/Kolkata');
    expect(modernZone('Europe/Kiev')).toBe('Europe/Kyiv');
    expect(modernZone('Asia/Tokyo')).toBe('Asia/Tokyo');
  });

  it('shows the current city for an old name', () => {
    expect(zoneLabel('Asia/Calcutta')).toEqual({ city: 'Kolkata', region: 'Asia' });
  });
});

describe('zoneOffset', () => {
  it('formats whole and half hours, behind and ahead', () => {
    expect(zoneOffset('America/Los_Angeles', WINTER)).toBe('UTC−8');
    expect(zoneOffset('Asia/Kolkata', WINTER)).toBe('UTC+5:30');
    expect(zoneOffset('Europe/London', WINTER)).toBe('UTC+0');
    expect(zoneOffset('UTC', WINTER)).toBe('UTC+0');
  });

  it('follows daylight saving time on the given date', () => {
    expect(zoneOffset('America/Los_Angeles', new Date('2026-07-15T12:00:00Z'))).toBe('UTC−7');
  });
});

describe('listZones and isKnownZone', () => {
  it('lists real zones plus UTC, without repeats', () => {
    const zones = listZones();

    expect(zones).toContain('Asia/Kolkata');
    expect(zones).toContain('UTC');
    expect(new Set(zones).size).toBe(zones.length);
  });

  it('accepts only listed zones', () => {
    expect(isKnownZone('Asia/Kolkata')).toBe(true);
    expect(isKnownZone('Asia/Calcutta')).toBe(true);
    expect(isKnownZone('Mars/Olympus_Mons')).toBe(false);
    expect(isKnownZone('')).toBe(false);
  });
});

describe('searchZones', () => {
  const zones = ['Asia/Kolkata', 'America/Los_Angeles', 'America/Argentina/Buenos_Aires', 'Europe/London', 'UTC'];

  it('returns everything for an empty search', () => {
    expect(searchZones(zones, '  ')).toEqual(zones);
  });

  it('matches the city, with or without the underscore', () => {
    expect(searchZones(zones, 'los angeles')).toEqual(['America/Los_Angeles']);
    expect(searchZones(zones, 'buenos')).toEqual(['America/Argentina/Buenos_Aires']);
  });

  it('matches the region', () => {
    expect(searchZones(zones, 'america')).toEqual(['America/Los_Angeles', 'America/Argentina/Buenos_Aires']);
  });

  it('is not case sensitive and puts a city that starts with the search first', () => {
    expect(searchZones(['Asia/Calcutta', 'America/Chicago', 'Europe/Lisbon'], 'ch')).toEqual(['America/Chicago']);
    expect(searchZones(['Europe/Lisbon', 'Asia/Colombo', 'America/Los_Angeles'], 'LO')).toEqual([
      'America/Los_Angeles',
      'Asia/Colombo',
    ]);
  });
});
