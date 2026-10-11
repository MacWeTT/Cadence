import fs from 'node:fs';

const edit = (p, pairs) => {
  let s = fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n');

  for (const [a, b] of pairs) {
    if (!s.includes(a)) {
      throw new Error(`${p} missing: ${a.slice(0, 80)}`);
    }

    s = s.replace(a, () => b);
  }

  fs.writeFileSync(p, s);
};

// Tests first: the wording, the yellow and red states and the tooltip at the limit.
edit('e2e/contact.spec.ts', [
  [`toHaveAttribute('aria-label', '1000 characters left')`, `toHaveAttribute('aria-label', '1,000 characters left')`],
  [`  await expect(page.locator('.character-limit__remaining')).toHaveText('15');`, `  await expect(page.locator('.character-limit__remaining')).toHaveText('15');
  await expect(limit).toHaveClass(/character-limit--warn/);
  await expect(page.getByRole('tooltip')).toHaveCount(0);`],
  [`  await expect(limit).toHaveAttribute('aria-label', '0 characters left');`, `  await expect(limit).toHaveAttribute('aria-label', '0 characters left');
  await expect(limit).toHaveClass(/character-limit--full/);
  await expect(page.getByRole('tooltip')).toHaveText('Limit reached: 1,000 characters');

  await message.fill('z'.repeat(500));
  await expect(limit).not.toHaveClass(/character-limit--(warn|full)/);
  await expect(page.getByRole('tooltip')).toHaveCount(0);`],
]);
