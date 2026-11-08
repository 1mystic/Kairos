import { expect, test } from '@playwright/test';

/**
 * Runs against the real route when the orchestrator has mounted cbtRoutes (set E2E_MOUNTED=1),
 * otherwise against the dev-only harness page that mounts the same routes.
 */
const mounted = !!process.env.E2E_MOUNTED;
const entry = (path: string) => (mounted ? path : `/src/cbt/_harness.html?path=${encodeURIComponent(path)}`);

test('guest: instructions, answer, refresh-resume, submit, result', async ({ page }) => {
  await page.goto(entry('/exam/sample_jee_mini_v1'));
  await page.getByLabel(/I have read/).check();
  await page.getByRole('button', { name: 'Start' }).click();
  await expect(page.getByTestId('exam-screen')).toBeVisible();

  await page.getByRole('radio').first().check();
  await page.getByRole('button', { name: 'Save & Next' }).click();
  await expect(page.getByTestId('legend-answered')).toHaveText('1');
  await expect(page.getByText('Question 2', { exact: false }).first()).toBeVisible();
  const t1 = await page.getByRole('timer').innerText();

  await page.waitForTimeout(1500); // debounce flush
  await page.reload();
  await page.getByRole('button', { name: 'Resume attempt' }).click();
  await expect(page.getByTestId('legend-answered')).toHaveText('1');
  await expect(page.getByText('Question 2', { exact: false }).first()).toBeVisible();
  const t2 = await page.getByRole('timer').innerText();
  expect(t2 <= t1).toBe(true); // clock kept counting down

  await page.getByRole('button', { name: 'Submit' }).click();
  await page.getByRole('button', { name: 'Yes, submit' }).click();
  await expect(page.getByTestId('score')).toHaveText(/-?\d+ \/ 36/);
  await expect(page.getByTestId('review-item').first()).toBeVisible();
});
