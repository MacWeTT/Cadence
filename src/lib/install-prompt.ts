/** The event a browser fires when Cadence can be installed (not in Safari). Kept until the person asks to install. */
export interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let held: InstallPromptEvent | null = null;
const listeners = new Set<() => void>();

const notify = () => {
  listeners.forEach(listener => {
    listener();
  });
};

export const captureInstallPrompt = (event: InstallPromptEvent) => {
  held = event;
  notify();
};

export const clearInstallPrompt = () => {
  held = null;
  notify();
};

export const hasInstallPrompt = (): boolean => {
  return held !== null;
};

/** For `useSyncExternalStore`: calls `listener` whenever the prompt arrives or goes. */
export const subscribeInstallPrompt = (listener: () => void) => {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
};

/** Shows the browser's install prompt. A prompt can be shown once, so it is spent either way. `null`: none was offered. */
export const promptInstall = async (): Promise<'accepted' | 'dismissed' | null> => {
  const event = held;

  if (!event) {
    return null;
  }

  held = null;
  notify();
  await event.prompt();

  return (await event.userChoice).outcome;
};

/** Safari on iPhone and iPad has no install prompt; people add the app from the Share menu. */
export const isIosDevice = (userAgent: string): boolean => {
  return /iPhone|iPad|iPod/.test(userAgent);
};
