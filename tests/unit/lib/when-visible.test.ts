import { describe, expect, it, vi } from 'vitest';
import { whenVisible } from '@/lib/when-visible';

const fakeDocument = (state: 'visible' | 'hidden') => {
  const listeners = new Set<() => void>();
  const doc = {
    visibilityState: state,
    addEventListener: (_: string, listener: () => void) => {
      listeners.add(listener);
    },
    removeEventListener: (_: string, listener: () => void) => {
      listeners.delete(listener);
    },
    show: () => {
      doc.visibilityState = 'visible';
      [...listeners].forEach(listener => {
        return listener();
      });
    },
    listening: () => {
      return listeners.size;
    },
  };

  return doc;
};

describe('whenVisible', () => {
  it('runs at once when the tab is visible', () => {
    const run = vi.fn();

    whenVisible(run, fakeDocument('visible'));

    expect(run).toHaveBeenCalledTimes(1);
  });

  it('waits while the tab is hidden, and runs once when it is shown', () => {
    const doc = fakeDocument('hidden');
    const run = vi.fn();

    whenVisible(run, doc);
    expect(run).not.toHaveBeenCalled();

    doc.show();
    expect(run).toHaveBeenCalledTimes(1);
    expect(doc.listening()).toBe(0);
  });

  it('can be cancelled before the tab is shown', () => {
    const doc = fakeDocument('hidden');
    const run = vi.fn();
    const cancel = whenVisible(run, doc);

    cancel();
    doc.show();

    expect(run).not.toHaveBeenCalled();
    expect(doc.listening()).toBe(0);
  });
});
