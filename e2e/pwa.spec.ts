import { expect, test } from '@playwright/test';

test('the manifest makes Cadence installable, with a maskable icon and shortcuts', async ({ request }) => {
  const response = await request.get('/manifest.webmanifest');

  expect(response.ok()).toBe(true);

  const manifest = await response.json();

  expect(manifest).toMatchObject({ name: 'Cadence', display: 'standalone', start_url: '/', scope: '/', id: '/' });
  expect(
    manifest.icons.map((icon: { purpose: string; sizes: string }) => {
      return `${icon.sizes} ${icon.purpose}`;
    }),
  ).toEqual(['192x192 any', '512x512 any', '512x512 maskable']);
  expect(
    manifest.shortcuts.map((shortcut: { url: string }) => {
      return shortcut.url;
    }),
  ).toEqual(['/today', '/progress']);

  for (const { src } of manifest.icons) {
    expect((await request.get(src)).ok()).toBe(true);
  }
});

test('the service worker is always fetched fresh', async ({ request }) => {
  const response = await request.get('/sw.js');

  expect(response.ok()).toBe(true);
  expect(response.headers()['content-type']).toContain('javascript');
  expect(response.headers()['cache-control']).toContain('no-cache');
});

test('with no connection the installed app shows an offline page instead of a browser error', async ({
  page,
  context,
}) => {
  await page.goto('/today');
  await page.evaluate(async () => {
    await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    await navigator.serviceWorker.ready;
  });

  await context.setOffline(true);
  await page.goto('/habits').catch(() => {});
  await expect(page.getByRole('heading', { name: "You're offline" })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Try again' })).toHaveAttribute('href', '/');

  await context.setOffline(false);
  await page.getByRole('link', { name: 'Try again' }).click();
  await expect(page.getByRole('banner')).toBeVisible();

  await page.evaluate(async () => {
    const registrations = await navigator.serviceWorker.getRegistrations();

    await Promise.all(
      registrations.map(registration => {
        return registration.unregister();
      }),
    );
  });
});

test('a page that cannot be reached because the server answered is not replaced by the offline page', async ({
  page,
}) => {
  const response = await page.goto('/this-page-does-not-exist');

  expect(response?.status()).toBe(404);
});

test('the account menu offers to install Cadence when the browser says it can be installed', async ({ page }) => {
  await page.goto('/today');
  await page.getByRole('button', { name: 'Account menu' }).click();
  await expect(page.getByRole('menuitem', { name: 'Install app' })).toHaveCount(0);
  await page.keyboard.press('Escape');

  await page.evaluate(() => {
    const event = new Event('beforeinstallprompt') as Event & {
      prompt: () => Promise<void>;
      userChoice: Promise<unknown>;
    };

    event.prompt = () => {
      (window as unknown as { __prompted: boolean }).__prompted = true;

      return Promise.resolve();
    };

    event.userChoice = Promise.resolve({ outcome: 'dismissed' });
    window.dispatchEvent(event);
  });
  await page.getByRole('button', { name: 'Account menu' }).click();
  await page.getByRole('menuitem', { name: 'Install app' }).click();

  expect(
    await page.evaluate(() => {
      return (window as unknown as { __prompted?: boolean }).__prompted;
    }),
  ).toBe(true);
  await page.getByRole('button', { name: 'Account menu' }).click();
  await expect(page.getByRole('menuitem', { name: 'Install app' })).toHaveCount(0); // a prompt can be shown only once
});
