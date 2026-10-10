import { expect, test } from '@playwright/test';
import { getProfileTimezone, resetUserData, setProfileTimezone } from './support/data';

const localDate = (timeZone: string) => new Intl.DateTimeFormat('en-CA', { timeZone }).format(new Date());
// At any instant at least one of these two zones is on a different calendar date from UTC.
const farZone = () =>
  ['Pacific/Kiritimati', 'Pacific/Pago_Pago'].find(z => localDate(z) !== localDate('UTC')) ?? 'Pacific/Kiritimati';

test.beforeEach(async () => {
  await resetUserData();
  await setProfileTimezone('UTC');
});
test.afterEach(async () => {
  await setProfileTimezone('UTC');
});

test('a first visit from another timezone saves it and uses its "today" for new habits', async ({
  browser,
  baseURL,
}) => {
  const timeZone = farZone();
  const context = await browser.newContext({ baseURL, storageState: 'e2e/.auth/user.json', timezoneId: timeZone });
  const page = await context.newPage();
  await page.goto('/habits');
  await expect.poll(getProfileTimezone).toBe(timeZone);

  // After the sync the page refreshes, so a newly opened dialog defaults to the user's own "today".
  await expect
    .poll(
      async () => {
        await page.getByRole('button', { name: 'New habit' }).first().click();
        const value = await page.getByLabel('Starts').inputValue();
        await page.keyboard.press('Escape');
        await expect(page.getByRole('dialog')).toBeHidden();
        return value;
      },
      { timeout: 10_000 },
    )
    .toBe(localDate(timeZone));
  await context.close();
});
