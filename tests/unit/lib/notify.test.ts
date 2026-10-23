import { afterEach, describe, expect, it, vi } from 'vitest';
import { notify } from '@/lib/notify';

const stub = (permission: string | null) => {
  const shown: [string, NotificationOptions | undefined][] = [];

  vi.stubGlobal('window', permission === null ? {} : { Notification: class {} });

  if (permission !== null) {
    vi.stubGlobal(
      'Notification',
      Object.assign(
        class {
          constructor(title: string, options?: NotificationOptions) {
            shown.push([title, options]);
          }
        },
        { permission },
      ),
    );
    vi.stubGlobal('window', { Notification: globalThis.Notification });
  }

  return shown;
};

describe('a notification on the web', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows when the person allowed it', () => {
    const shown = stub('granted');

    notify('Read', 'Focus done');

    expect(shown).toEqual([['Read', { body: 'Focus done' }]]);
  });

  it('shows nothing when it was not allowed, or the browser has none', () => {
    const denied = stub('default');

    notify('Read', 'Focus done');
    expect(denied).toEqual([]);

    stub(null);
    expect(() => {
      notify('Read', 'Focus done');
    }).not.toThrow();
  });
});
