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

  // Measure once the fonts are in and the layout has settled: a late font swap moves the second row by a few pixels.
  await page.evaluate(() => {
    return document.fonts.ready;
  });

  const box = async (label: string) => {
    const found = await page.getByLabel(label).boundingBox();

    return { y: Math.round(found!.y), height: Math.round(found!.height) };
  };

  await expect
    .poll(async () => {
      return await box('Your name (optional)');
    })
    .toEqual(await box('Your email (optional)'));
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

test.describe('with motion, arriving from another page', () => {
  test.use({ reducedMotion: 'no-preference' });

  test('the page arrives whole: the form is never missing while the title is already there', async ({ page }) => {
    await page.addInitScript(() => {
      return window.sessionStorage.setItem('cadence:splash', '1');
    });
    await page.goto('/habits');
    await expect(page.getByRole('heading', { name: 'Habits', level: 1 })).toBeVisible();

    // Watch every change to the page: record whether the title was ever there without the form.
    await page.evaluate(() => {
      const w = window as unknown as { __titleWithoutForm: boolean };

      w.__titleWithoutForm = false;
      new MutationObserver(() => {
        const title = [...document.querySelectorAll('h1')].some(h => {
          return h.textContent === 'Contact';
        });

        if (title && !document.querySelector('#contact-message')) {
          w.__titleWithoutForm = true;
        }
      }).observe(document.body, { childList: true, subtree: true });
    });

    await page.getByRole('contentinfo').getByRole('link', { name: 'Contact' }).click();
    await expect(page.locator('#contact-message')).toBeVisible();

    expect(
      await page.evaluate(() => {
        return (window as unknown as { __titleWithoutForm: boolean }).__titleWithoutForm;
      }),
    ).toBe(false);
  });
});

test('the message is capped at 1000 characters, and a ring counts down to it like a tweet', async ({ page }) => {
  await page.goto('/contact');

  const message = page.getByLabel('Your message');
  const limit = page.getByRole('img', { name: /characters left/ });

  await expect(limit).toHaveAttribute('aria-label', '1000 characters left');

  await message.fill('x'.repeat(985));
  await expect(limit).toHaveAttribute('aria-label', '15 characters left');
  await expect(page.locator('.character-limit__remaining')).toHaveText('15');
  await expect(limit).toHaveClass(/character-limit--warn/);
  await expect(page.getByRole('tooltip')).toHaveCount(0);

  await message.fill('y'.repeat(1300));
  await expect(message).toHaveValue('y'.repeat(1000));
  await expect(limit).toHaveAttribute('aria-label', '0 characters left');
  await expect(limit).toHaveClass(/character-limit--full/);
  await expect(page.getByRole('tooltip')).toHaveText('Limit reached: 1000 characters');

  await message.fill('z'.repeat(500));
  await expect(limit).not.toHaveClass(/character-limit--(warn|full)/);
  await expect(page.getByRole('tooltip')).toHaveCount(0);
});
