import { expect, test, type Page } from '@playwright/test';
import { adminClient, getProfileRow, resetProfile, setAccent } from '@e2e/support/data';

// A valid WAV: mono, 8 kHz, 16-bit, silent, `seconds` long.
const wav = (seconds: number): Buffer => {
  const samples = 8000 * seconds;
  const data = samples * 2;
  const header = Buffer.alloc(44);

  header.write('RIFF', 0);
  header.writeUInt32LE(36 + data, 4);
  header.write('WAVEfmt ', 8);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(8000, 24);
  header.writeUInt32LE(16_000, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(data, 40);

  return Buffer.concat([header, Buffer.alloc(data)]);
};

// A 1 by 1 PNG.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);

test.beforeEach(async () => {
  await resetProfile();
});
test.afterEach(async () => {
  await resetProfile();
});

const row = (page: Page, label: string) => {
  return page.getByRole('button', { name: new RegExp(`^${label}`) });
};

test('the old Appearance address lands on the Appearance tab', async ({ page }) => {
  await page.goto('/appearance');

  await expect(page).toHaveURL(/\/profile\/appearance$/);
  await expect(page.getByRole('heading', { level: 2, name: 'Appearance' })).toBeVisible();
});

test('the tabs switch between Overview, Appearance and Notifications', async ({ page }) => {
  await page.goto('/profile');
  await expect(page.getByRole('heading', { level: 1, name: 'E2E User' })).toBeVisible();

  const tabs = page.getByRole('navigation', { name: 'Profile sections' });

  await tabs.getByRole('link', { name: 'Notifications' }).click();
  await expect(page).toHaveURL(/\/profile\/notifications$/);
  await tabs.getByRole('link', { name: 'Appearance' }).click();
  await expect(page).toHaveURL(/\/profile\/appearance$/);
  await tabs.getByRole('link', { name: 'Overview' }).click();
  await expect(row(page, 'Name')).toBeVisible();
});

test('push and email reminders are switched off and disabled, marked coming soon', async ({ page }) => {
  await page.goto('/profile/notifications');

  await expect(page.getByRole('switch', { name: 'Push notifications' })).toBeDisabled();
  await expect(page.getByRole('switch', { name: 'Email reminders' })).toBeDisabled();
  await expect(page.getByText('Coming soon')).toHaveCount(2);
});

test('Get the app offers the web app and the Windows installer as a direct download', async ({ page }) => {
  await page.goto('/profile');
  await page.getByRole('button', { name: 'Get the app' }).click();

  await expect(page.getByRole('menuitem', { name: /Installer/ })).toHaveAttribute(
    'href',
    'https://github.com/MacWeTT/Cadence/releases/latest/download/Cadence-Setup.exe',
  );
  await expect(page.getByRole('menuitem', { name: /Web app/ })).toBeVisible();
});

test('choosing the installer says what to do about the Windows warning', async ({ page }) => {
  // the download itself is GitHub's: it is answered here so the test needs no network
  await page.context().route('https://github.com/**', route => {
    return route.fulfill({ status: 200, body: 'installer' });
  });
  await page.goto('/profile');
  await page.getByRole('button', { name: 'Get the app' }).click();
  await page.getByRole('menuitem', { name: /Installer/ }).click();

  await expect(page.getByText(/unknown publisher/)).toBeVisible();
  await expect(page.getByText(/More info/)).toBeVisible();
});

test('changing the name shows it at once, with a toast, and saves it', async ({ page }) => {
  await page.goto('/profile');
  await row(page, 'Name').click();
  await page.getByRole('textbox', { name: 'Name' }).fill('  Ada Lovelace ');
  await page.getByRole('button', { name: 'Save' }).click();

  await expect(row(page, 'Name')).toContainText('Ada Lovelace');
  await expect(page.getByText('Name updated')).toBeVisible();
  await expect
    .poll(async () => {
      return (await getProfileRow()).display_name;
    })
    .toBe('Ada Lovelace');
});

test('the profile header shows the tag, made from the email', async ({ page }) => {
  await page.goto('/profile');

  await expect(page.getByRole('heading', { level: 1, name: 'E2E User' })).toBeVisible();
  await expect(page.locator('.profile-header').getByText('@e2e', { exact: true })).toBeVisible();
});

test('changing the tag forgives the @ and capitals, shows at once, and saves it', async ({ page }) => {
  await page.goto('/profile');
  await row(page, 'Tag').click();
  await page.getByRole('textbox', { name: 'Tag' }).fill('@Manas_B');
  await page.getByRole('button', { name: 'Save' }).click();

  await expect(row(page, 'Tag')).toContainText('@manas_b');
  await expect(page.getByText('Tag changed to @manas_b')).toBeVisible();
  await expect
    .poll(async () => {
      return (await getProfileRow()).tag;
    })
    .toBe('manas_b');
});

test('a tag that is too short or reserved cannot be saved', async ({ page }) => {
  await page.goto('/profile');
  await row(page, 'Tag').click();

  const save = page.getByRole('button', { name: 'Save' });

  await page.getByRole('textbox', { name: 'Tag' }).fill('ab');
  await expect(save).toBeDisabled();
  await page.getByRole('textbox', { name: 'Tag' }).fill('admin');
  await expect(save).toBeDisabled();
  await page.getByRole('textbox', { name: 'Tag' }).fill('fine_tag');
  await expect(save).toBeEnabled();
});

test('a tag that someone else has is refused, and the old tag stays', async ({ page }) => {
  const admin = adminClient();
  const email = `taken-${Date.now()}@cadence.test`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: 'taken-password-123!',
    email_confirm: true,
  });

  if (error || !data.user) {
    throw error;
  }

  try {
    const taken = email.split('@')[0].replace('-', '_');

    await page.goto('/profile');
    await row(page, 'Tag').click();
    await page.getByRole('textbox', { name: 'Tag' }).fill(taken.toUpperCase());
    await page.getByRole('button', { name: 'Save' }).click();

    await expect(page.getByText('That tag is taken. Try another.')).toBeVisible();
    await expect(row(page, 'Tag')).toContainText('@e2e');
  } finally {
    await admin.auth.admin.deleteUser(data.user.id);
  }
});

test('a save the server refuses puts the old value back and shows an error', async ({ page }) => {
  await page.route('**/profile', route => {
    return route.request().headers()['next-action'] ? route.abort() : route.continue();
  });
  await page.goto('/profile');
  await row(page, 'Name').click();
  await page.getByRole('textbox', { name: 'Name' }).fill('Nobody');
  await page.getByRole('button', { name: 'Save' }).click();

  await expect(page.getByText('Something went wrong. Please try again.')).toBeVisible();
  await expect(row(page, 'Name')).toContainText('E2E User');
});

test('the week can start on Sunday', async ({ page }) => {
  await page.goto('/profile');
  await row(page, 'Week starts on').click();
  await page.getByLabel('Sunday').check();
  await page.getByRole('button', { name: 'Save' }).click();

  await expect(page.getByText('Week now starts on Sunday')).toBeVisible();
  await expect(row(page, 'Week starts on')).toContainText('Sunday');
  await expect
    .poll(async () => {
      return (await getProfileRow()).week_starts_on;
    })
    .toBe(7);
});

test('the timezone is chosen from a list of cities, with the warning shown first', async ({ page }) => {
  await page.goto('/profile');
  await row(page, 'Timezone').click();

  await expect(page.getByText('Changing your timezone changes what “today” means.')).toBeVisible();
  await expect(page.getByRole('option')).toHaveCount(0); // closed until opened

  await page.getByRole('button', { name: 'Choose a timezone' }).click();
  await expect(page.getByRole('option').filter({ hasText: '_' })).toHaveCount(0);
  await page.getByRole('searchbox', { name: 'Search cities' }).fill('tokyo');
  await page.getByRole('option', { name: /Tokyo/ }).click();
  await page.getByRole('button', { name: 'Save' }).click();

  await expect(page.getByText('Timezone set to Tokyo')).toBeVisible();
  await expect(row(page, 'Timezone')).toContainText('Tokyo');
  await expect
    .poll(async () => {
      return (await getProfileRow()).timezone;
    })
    .toBe('Asia/Tokyo');
});

test('a character avatar can be chosen with a colour', async ({ page }) => {
  await page.goto('/profile');
  await row(page, 'Photo').click();
  await page.getByRole('button', { name: 'Robot' }).click();
  await page.getByRole('button', { name: 'Clay' }).click();
  await page.getByRole('button', { name: 'Save' }).click();

  await expect(page.getByText('Avatar updated')).toBeVisible();
  await expect
    .poll(async () => {
      const { avatar_kind, avatar_value, avatar_color } = await getProfileRow();

      return [avatar_kind, avatar_value, avatar_color];
    })
    .toEqual(['character', 'robot', '#a8512b']);
});

test('the avatar in the top bar wears the colour that was chosen, not the app colour', async ({ page }) => {
  await page.goto('/profile');
  await row(page, 'Photo').click();
  await page.getByRole('button', { name: 'Ghost' }).click();
  await page.getByRole('button', { name: 'Plum' }).click();
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('Avatar updated')).toBeVisible();

  const colour = (selector: string) => {
    return page
      .locator(selector)
      .first()
      .evaluate(element => {
        return getComputedStyle(element).backgroundColor;
      });
  };

  await expect
    .poll(() => {
      return colour('.user-menu__trigger .avatar');
    })
    .toBe(await colour('.profile-header__avatar'));
});

test('a dialog closes with one Escape: its close button does not open a tooltip that takes it', async ({ page }) => {
  await page.goto('/profile');
  await row(page, 'Name').click();
  await expect(page.getByRole('dialog')).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('the chosen character is named under the picture', async ({ page }) => {
  await page.goto('/profile');
  await row(page, 'Photo').click();
  await expect(page.getByText('Current: Google photo')).toBeVisible();
  await page.getByRole('button', { name: 'Mage' }).click();

  await expect(page.getByText('Preview: Mage')).toBeVisible();
});

test('the app accent is kept on the account', async ({ page }) => {
  await page.goto('/profile/appearance');
  await page.getByLabel('Clay').check({ force: true });

  await expect
    .poll(async () => {
      return (await getProfileRow()).accent;
    })
    .toBe('clay');
});

test('an accent on the account is applied on a fresh browser', async ({ browser, baseURL }) => {
  await setAccent('plum');

  const context = await browser.newContext({ baseURL, storageState: 'e2e/.auth/user.json' });
  const page = await context.newPage();

  await page.goto('/profile');
  await expect(page.locator('html')).toHaveAttribute('data-accent', 'plum');
  await context.close();
});

test('an emoji avatar can be chosen', async ({ page }) => {
  await page.goto('/profile');
  await row(page, 'Photo').click();
  await page.getByRole('button', { name: '🔥' }).click();
  await page.getByRole('button', { name: 'Save' }).click();

  await expect(page.getByText('Avatar updated')).toBeVisible();
  await expect
    .poll(async () => {
      return (await getProfileRow()).avatar_value;
    })
    .toBe('🔥');
});

test('a photo is cropped, uploaded and becomes the avatar', async ({ page }) => {
  await page.goto('/profile');
  await row(page, 'Photo').click();
  await page.locator('input[type=file]').setInputFiles({ name: 'me.png', mimeType: 'image/png', buffer: PNG });
  await page.getByRole('button', { name: 'Save' }).click();

  await expect(page.getByText('Avatar updated')).toBeVisible();
  await expect
    .poll(async () => {
      return (await getProfileRow()).avatar_kind;
    })
    .toBe('photo');
});

test('a photo of the wrong kind is refused', async ({ page }) => {
  await page.goto('/profile');
  await row(page, 'Photo').click();
  await page
    .locator('input[type=file]')
    .setInputFiles({ name: 'x.gif', mimeType: 'image/gif', buffer: Buffer.from('GIF89a') });

  await expect(page.getByText('Use a JPEG, PNG or WebP photo')).toBeVisible();
});

test('a built-in sound can be chosen', async ({ page }) => {
  await page.goto('/profile');
  await row(page, 'Focus sound').click();
  await page.getByRole('button', { name: 'Marimba' }).click();
  await page.getByRole('button', { name: 'Save' }).click();

  await expect(page.getByText('Focus sound set to Marimba')).toBeVisible();
  await expect(row(page, 'Focus sound')).toContainText('Marimba');
  await expect
    .poll(async () => {
      return (await getProfileRow()).sound_id;
    })
    .toBe('marimba');
});

test('a custom sound can be added and removed', async ({ page }) => {
  await page.goto('/profile');
  await row(page, 'Focus sound').click();
  await page.locator('input[type=file]').setInputFiles({ name: 'ping.wav', mimeType: 'audio/wav', buffer: wav(1) });

  await expect(page.getByText('ping.wav added')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Remove ping' })).toBeVisible();

  await page.getByRole('button', { name: 'Remove ping' }).click();
  await expect(page.getByText('ping removed')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Remove ping' })).toHaveCount(0);
});

test('a sound longer than 5 seconds is refused', async ({ page }) => {
  await page.goto('/profile');
  await row(page, 'Focus sound').click();
  await page.locator('input[type=file]').setInputFiles({ name: 'long.wav', mimeType: 'audio/wav', buffer: wav(6) });

  await expect(page.getByText('Keep the sound to 5 seconds or less')).toBeVisible();
});
