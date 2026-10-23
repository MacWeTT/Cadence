import { expect, test } from '@playwright/test';

// The page Google comes back to for the desktop app: it only hands the one-time code over with a cadence:// link.
test.use({ storageState: { cookies: [], origins: [] } });

test('hands the code to the desktop app with a link, and offers a button if the app does not open', async ({
  page,
}) => {
  await page.goto('/auth/desktop?code=abc-DEF_123');

  await expect(page.getByRole('heading', { name: 'Opening Cadence' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Open Cadence' })).toHaveAttribute(
    'href',
    'cadence://auth?code=abc-DEF_123',
  );
});

test('puts nothing odd into the link when the code is missing or malformed', async ({ request }) => {
  for (const query of ['', '?code=a b%26c', '?error=access_denied']) {
    const html = await (await request.get(`/auth/desktop${query}`)).text();
    const [, link] = /href="(cadence:[^"]*)"/.exec(html) ?? [];

    expect(link).toBe(query.startsWith('?error') ? 'cadence://auth?error=access_denied' : 'cadence://auth?error=auth');
  }
});
