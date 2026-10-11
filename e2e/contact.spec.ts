import { expect, test } from '@playwright/test';
import { clearContactMessages, E2E_USER, getContactMessages } from '@e2e/support/data';

test.beforeEach(async () => {
  await clearContactMessages();
});

test("the footer's Contact link opens the contact page", async ({ page }) => {
  await page.goto('/habits');
  await page.getByRole('contentinfo').getByRole('link', { name: 'Contact' }).click();

  await expect(page).toHaveURL(/\/contact$/);
  await expect(page.getByRole('heading', { name: 'Contact', level: 1 })).toBeVisible();
  await expect(page).toHaveTitle('Contact · Cadence');
});

test("a message is sent with the sender's name and email filled in from their account", async ({ page }) => {
  await page.goto('/contact');
  await expect(page.getByLabel('Your email (optional)')).toHaveValue(E2E_USER.email);
  await page.getByLabel('Your name (optional)').fill('E2E User');

  await page.getByLabel('Your message').fill('Great app, one idea:\nsplit the day in two.');
  await page.getByRole('button', { name: 'Send message' }).click();

  await expect(page.getByRole('heading', { name: /Thanks/ })).toBeVisible();

  const [row] = await getContactMessages();

  expect(row).toMatchObject({
    message: 'Great app, one idea:\nsplit the day in two.',
    anonymous: false,
    name: 'E2E User',
    email: E2E_USER.email,
  });
  expect(row.user_id).not.toBeNull();
});

test('an anonymous message keeps no name, no email and no account', async ({ page }) => {
  await page.goto('/contact');
  await page.getByLabel('Send anonymously').check();
  await expect(page.getByLabel('Your name (optional)')).toBeDisabled();
  await expect(page.getByLabel('Your email (optional)')).toBeDisabled();

  await page.getByLabel('Your message').fill('A quiet note.');
  await page.getByRole('button', { name: 'Send message' }).click();
  await expect(page.getByRole('heading', { name: /Thanks/ })).toBeVisible();

  const [row] = await getContactMessages();

  expect(row).toMatchObject({ message: 'A quiet note.', anonymous: true, name: null, email: null, user_id: null });
});

test('an empty message, or a bad email, is explained and nothing is sent', async ({ page }) => {
  await page.goto('/contact');
  await page.getByRole('button', { name: 'Send message' }).click();
  await expect(page.getByText('Write a message first')).toBeVisible();

  await page.getByLabel('Your message').fill('Hi');
  await page.getByLabel('Your email (optional)').fill('not-an-email');
  await page.getByRole('button', { name: 'Send message' }).click();
  await expect(page.getByText(/Enter a valid email address/)).toBeVisible();
  expect(await getContactMessages()).toHaveLength(0);
});

test('a bot that fills the hidden field is told it worked, and nothing is stored', async ({ page }) => {
  await page.goto('/contact');
  await page.getByLabel('Your message').fill('Buy my stuff');
  await page.locator('input[name="website"]').fill('http://spam.example', { force: true });
  await page.getByRole('button', { name: 'Send message' }).click();

  await expect(page.getByRole('heading', { name: /Thanks/ })).toBeVisible();
  expect(await getContactMessages()).toHaveLength(0);
});

test('the message can be sent again after a send', async ({ page }) => {
  await page.goto('/contact');
  await page.getByLabel('Your message').fill('First');
  await page.getByRole('button', { name: 'Send message' }).click();
  await page.getByRole('button', { name: 'Write another' }).click();
  await expect(page.getByLabel('Your message')).toHaveValue('');
});

test('the two fields line up, and the message box cannot be resized', async ({ page }) => {
  await page.goto('/contact');
  await expect(page.getByLabel('Your name (optional)')).toBeVisible();

  const name = await page.getByLabel('Your name (optional)').boundingBox();
  const email = await page.getByLabel('Your email (optional)').boundingBox();

  expect(Math.round(name!.y)).toBe(Math.round(email!.y));
  expect(Math.round(name!.height)).toBe(Math.round(email!.height));
  await expect(page.getByLabel('Your message')).toHaveCSS('resize', 'none');
});

test.describe('with motion', () => {
  test.use({ reducedMotion: 'no-preference' });

  test('the thanks panel and the error lines ease in and end fully shown', async ({ page }) => {
    await page.addInitScript(() => {
      return window.sessionStorage.setItem('cadence:splash', '1');
    });
    await page.goto('/contact');

    await page.getByRole('button', { name: 'Send message' }).click();

    const error = page.getByText('Write a message first');

    await expect(error).toBeVisible();
    await expect(error).toHaveCSS('opacity', '1', { timeout: 5000 });

    await page.getByLabel('Your message').fill('Hello');
    await page.getByRole('button', { name: 'Send message' }).click();

    const thanks = page.getByRole('status');

    await expect(thanks).toContainText('Thanks');
    await expect(thanks).toHaveCSS('opacity', '1', { timeout: 5000 });
    await expect(page.getByLabel('Your message')).toHaveCount(0);
  });
});
