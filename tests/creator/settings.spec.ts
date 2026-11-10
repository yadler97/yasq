import { expect, test } from '@playwright/test';
import { SettingsPage } from './pages/SettingsPage';

async function resetSettings(page: import('@playwright/test').Page) {
  const response = await page.request.delete('/api/settings');
  expect(response.ok()).toBeTruthy();
}

test('saves game settings', async ({ page }) => {
  const settingsPage = new SettingsPage(page);
  await resetSettings(page);

  try {
    await settingsPage.goto('/settings');
    await expect(settingsPage.roundsInput).toBeVisible();
    await settingsPage.roundsInput.fill('17');

    page.once('dialog', async dialog => {
      expect(dialog.message()).toBe('Settings saved successfully!');
      await dialog.accept();
    });
    await settingsPage.saveSettingsButton.click();

    await expect(settingsPage.roundsInput).toHaveValue('17');
    await page.reload();
    await expect(settingsPage.roundsInput).toHaveValue('17');
  } finally {
    await resetSettings(page);
  }
});
