interface VisibilitySource {
  visibilityState: string;
  addEventListener: (type: 'visibilitychange', listener: () => void) => void;
  removeEventListener: (type: 'visibilitychange', listener: () => void) => void;
}

/**
 * Runs `run` now if the tab is showing, otherwise as soon as it is shown. A refresh or navigation started in a
 * background tab makes the browser abort the page's view transition ("Document hidden"), so these wait. Returns a
 * function that cancels the wait.
 */
export const whenVisible = (run: () => void, doc: VisibilitySource = document): (() => void) => {
  const { visibilityState: now } = doc;

  if (now === 'visible') {
    run();

    return () => {};
  }

  const onChange = () => {
    const { visibilityState: later } = doc;

    if (later === 'visible') {
      doc.removeEventListener('visibilitychange', onChange);
      run();
    }
  };

  doc.addEventListener('visibilitychange', onChange);

  return () => {
    doc.removeEventListener('visibilitychange', onChange);
  };
};
