import { expect, test } from './test_setup.js';

test('should save game settings', async ({ page, settingsPage }) => {
  await settingsPage.goto('/settings');
  await expect(settingsPage.roundsInput).toBeVisible();
  await settingsPage.roundsInput.fill('17');

  const dialogMessage = page.waitForEvent('dialog').then(async dialog => {
    const message = dialog.message();
    await dialog.accept();
    return message;
  });
  await settingsPage.saveSettingsButton.click();
  expect(await dialogMessage).toBe('Settings saved successfully!');

  await expect(settingsPage.roundsInput).toHaveValue('17');
  await page.reload();
  await expect(settingsPage.roundsInput).toHaveValue('17');
});
