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
    throw new Error(`Request failed (${status})`);
  }

  return json();
};
