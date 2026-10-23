import { describe, expect, it } from 'vitest';
import { avatarName, circleTitle, inviteUrl, memberName, toAvatarView } from '@/lib/circle-people';

describe('memberName', () => {
  it('uses the name a person gave, trimmed', () => {
    expect(memberName('Sam', 'sam_2')).toBe('Sam');
    expect(memberName('  Sam Lee  ', 'sam_2')).toBe('Sam Lee');
  });

  it('falls back to the @tag when there is no name', () => {
    expect(memberName(null, 'sam_2')).toBe('@sam_2');
    expect(memberName('', 'sam_2')).toBe('@sam_2');
    expect(memberName('   ', 'sam_2')).toBe('@sam_2');
  });
});

describe('avatarName', () => {
  it('gives the avatar a name to take its initial from, never the @', () => {
    expect(avatarName('Sam', 'kim')).toBe('Sam');
    expect(avatarName(null, 'kim')).toBe('kim');
    expect(avatarName('  ', 'kim')).toBe('kim');
  });
});

describe('inviteUrl', () => {
  it('puts the token on the join page of this site', () => {
    expect(inviteUrl('https://cadence.app', 'abc')).toBe('https://cadence.app/circles/join/abc');
  });

  it('does not double the slash when the origin ends with one', () => {
    expect(inviteUrl('http://localhost:3000/', 'abc')).toBe('http://localhost:3000/circles/join/abc');
  });
});

describe('toAvatarView', () => {
  it('passes a Google, character or emoji avatar through unchanged', () => {
    const google = { kind: 'google', value: null, color: null, url: 'https://example.com/a.png' } as const;
    const emoji = { kind: 'emoji', value: '🦊', color: '#b8643c', url: null } as const;

    expect(toAvatarView(google)).toEqual(google);
    expect(toAvatarView(emoji)).toEqual(emoji);
  });

  it('shows the initial for a photo a friend cannot see, which the Avatar draws when it has no picture', () => {
    expect(toAvatarView({ kind: 'initial', value: null, color: null, url: null })).toEqual({
      kind: 'google',
      value: null,
      color: null,
      url: null,
    });
  });
});

describe('circleTitle', () => {
  it('is the circle name for a group', () => {
    expect(circleTitle({ kind: 'group', name: 'Study group', partnerName: null, partnerTag: null })).toBe(
      'Study group',
    );
  });

  it('is the partner for a pair, by name or else by @tag', () => {
    expect(circleTitle({ kind: 'pair', name: 'Partners', partnerName: ' Sam ', partnerTag: 'sam' })).toBe('Sam');
    expect(circleTitle({ kind: 'pair', name: 'Partners', partnerName: null, partnerTag: 'sam' })).toBe('@sam');
  });

  it('is nothing for a pair still waiting for its partner, so the screen can say so', () => {
    expect(circleTitle({ kind: 'pair', name: 'Partners', partnerName: null, partnerTag: null })).toBeNull();
  });
});
