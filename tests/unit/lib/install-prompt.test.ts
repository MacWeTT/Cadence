import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  captureInstallPrompt,
  clearInstallPrompt,
  hasInstallPrompt,
  isIosDevice,
  promptInstall,
  subscribeInstallPrompt,
  type InstallPromptEvent,
} from '@/lib/install-prompt';

const fakeEvent = (outcome: 'accepted' | 'dismissed' = 'accepted'): InstallPromptEvent => {
  return { prompt: vi.fn().mockResolvedValue(undefined), userChoice: Promise.resolve({ outcome }) } as never;
};

describe('the install prompt the browser offers', () => {
  beforeEach(() => {
    clearInstallPrompt();
  });

  it('is held until it is used, and tells listeners when it arrives and goes', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeInstallPrompt(listener);

    expect(hasInstallPrompt()).toBe(false);
    captureInstallPrompt(fakeEvent());
    expect(hasInstallPrompt()).toBe(true);
    expect(listener).toHaveBeenCalledTimes(1);

    clearInstallPrompt();
    expect(hasInstallPrompt()).toBe(false);
    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
    captureInstallPrompt(fakeEvent());
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('shows the browser prompt once and is spent either way', async () => {
    const event = fakeEvent('dismissed');

    captureInstallPrompt(event);

    expect(await promptInstall()).toBe('dismissed');
    expect(event.prompt).toHaveBeenCalledTimes(1);
    expect(hasInstallPrompt()).toBe(false);
  });

  it('has nothing to show when no prompt was offered', async () => {
    expect(await promptInstall()).toBeNull();
  });
});

describe('isIosDevice', () => {
  it('recognises iPhone, iPad and iPod, and nothing else', () => {
    expect(isIosDevice('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15')).toBe(true);
    expect(isIosDevice('Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)')).toBe(true);
    expect(isIosDevice('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130.0')).toBe(false);
    expect(isIosDevice('Mozilla/5.0 (Linux; Android 14) Chrome/130.0 Mobile')).toBe(false);
  });
});
