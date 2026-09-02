import { test, expect } from '@playwright/test';
test('refresh cannot vote twice', async ({ page }) => {
  await page.goto('/index.html');
  await page.fill('#nis','TEST001'); await page.fill('#token','111111'); await page.click('button[type=submit]');
  await expect(page).toHaveURL(/vote.html/);
  await page.click('[data-candidate="1"]'); await page.click('#confirm-yes');
  await expect(page).toHaveURL(/thankyou.html/);
  await page.goto('/vote.html');
  await expect(page.locator('body')).toContainText(/sudah memilih/i);
});
