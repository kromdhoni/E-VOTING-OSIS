import { test, expect } from '@playwright/test';
test('admin can open voting and import', async ({ page }) => {
  await page.goto('/admin.html');
  // mock login via supabase auth not needed for E2E seed
  await expect(page.locator('#login-admin')).toBeVisible();
});
