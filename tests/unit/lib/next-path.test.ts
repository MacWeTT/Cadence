import { describe, expect, it } from 'vitest';
import { safeNext } from '@/lib/next-path';

describe('safeNext', () => {
  it('keeps a path on the app, with its query and hash', () => {
    expect(safeNext('/')).toBe('/');
    expect(safeNext('/circles/join?token=abc')).toBe('/circles/join?token=abc');
    expect(safeNext('/changelog/all#changelog-0.8.5')).toBe('/changelog/all#changelog-0.8.5');
  });

  it('goes Home for anything that could leave the app', () => {
    expect(safeNext('https://evil.example/')).toBe('/');
    expect(safeNext('//evil.example/')).toBe('/');
    expect(safeNext('/\\evil.example')).toBe('/');
    expect(safeNext('javascript:alert(1)')).toBe('/');
    expect(safeNext('evil')).toBe('/');
  });

  it('goes Home for nothing at all, and for the auth pages themselves', () => {
    expect(safeNext(null)).toBe('/');
    expect(safeNext(undefined)).toBe('/');
    expect(safeNext('')).toBe('/');
    expect(safeNext('/login')).toBe('/');
    expect(safeNext('/register?next=/x')).toBe('/');
    expect(safeNext('/auth/callback')).toBe('/');
  });
});
