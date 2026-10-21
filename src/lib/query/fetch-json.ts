/** A failed answer from one of the app's endpoints, with its status so a page can tell "not found" from a broken network. */
export class HttpError extends Error {
  constructor(readonly status: number) {
    super(`Request failed (${status})`);
  }
}

/** Reads JSON from one of the app's own endpoints. A signed-out answer sends the person to the login page. */
export const fetchJson = async <T>(url: string): Promise<T> => {
  const { status, ok, json } = await fetch(url, { headers: { Accept: 'application/json' } }).then(response => {
    return {
      status: response.status,
      ok: response.ok,
      json: () => {
        return response.json() as Promise<T>;
      },
    };
  });

  if (status === 401) {
    window.location.replace('/login'); // a full load, so nothing of this session stays in the page

    throw new Error('Signed out');
  }

  if (!ok) {
    throw new HttpError(status);
  }

  return json();
};
