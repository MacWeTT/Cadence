import { describe, expect, it } from 'vitest';
import { buildDesktopLink, parseDesktopLink } from '@/lib/desktop-link';

describe('the link that hands a Google sign-in back to the desktop app', () => {
  it('carries the one-time code', () => {
    expect(buildDesktopLink({ code: 'abc-DEF_123' })).toBe('cadence://auth?code=abc-DEF_123');
  });

  it('carries a refusal instead of a code', () => {
    expect(buildDesktopLink({ error: 'access_denied' })).toBe('cadence://auth?error=access_denied');
  });

  it('makes nothing from a missing or odd code, so nothing odd is put in the link', () => {
    expect(buildDesktopLink({})).toBe('cadence://auth?error=auth');
    expect(buildDesktopLink({ code: 'a b&c=d' })).toBe('cadence://auth?error=auth');
    expect(buildDesktopLink({ code: 'x'.repeat(300) })).toBe('cadence://auth?error=auth');
  });

  it('reads a code or a refusal back out of a link, and nothing from any other link', () => {
    expect(parseDesktopLink('cadence://auth?code=abc-DEF_123')).toEqual({ code: 'abc-DEF_123' });
    expect(parseDesktopLink('cadence://auth?error=auth')).toEqual({ error: 'auth' });
    expect(parseDesktopLink('cadence://other?code=abc')).toBeNull();
    expect(parseDesktopLink('https://cadence.example/auth?code=abc')).toBeNull();
    expect(parseDesktopLink('cadence://auth')).toBeNull();
    expect(parseDesktopLink('not a url')).toBeNull();
  });
});
