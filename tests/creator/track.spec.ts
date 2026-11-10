import { expect, test } from '@playwright/test';
import { rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { TrackPage } from './pages/TrackPage';

async function removeTestTrack(page: import('@playwright/test').Page, audioFileName: string) {
  const response = await page.request.get('/api/tracks');
  expect(response.ok()).toBeTruthy();

  const tracks: Array<{ audio: string }> = await response.json();
  for (let index = tracks.length - 1; index >= 0; index--) {
    if (tracks[index].audio === audioFileName) {
      const deleteResponse = await page.request.delete(`/api/tracks/${index}`);
      expect(deleteResponse.status()).toBe(204);
    }
  }

  await rm(resolve(process.cwd(), 'tests', 'creator', 'data', 'music', audioFileName), { force: true });
}

test('creates a track with a tag', async ({ page }, testInfo) => {
  const audioFileName = `playwright-${testInfo.testId.replace(/[^a-zA-Z0-9_-]/g, '-')}.mp3`;
  const trackPage = new TrackPage(page);

  await removeTestTrack(page, audioFileName);
  try {
    await trackPage.goto('/tracks');
    await trackPage.addTrackButton.click();
    await expect(trackPage.trackForm.getByRole('heading', { name: 'Add New Track' })).toBeVisible();

    await trackPage.gameNameInput.fill('Playwright Test Game');
    await trackPage.trackTitleInput.fill('Playwright Test Track');
    await trackPage.audioFileInput.setInputFiles({
      name: audioFileName,
      mimeType: 'audio/mpeg',
      buffer: Buffer.from('test audio'),
    });
    await trackPage.addTagButton.click();
    await trackPage.getTagTypeInput().fill('Test Category');
    await trackPage.getTagValueInput().fill('Test Tag');
    await trackPage.saveTrackButton.click();

    const trackCard = trackPage.getTrackCard('Playwright Test Track');
    await expect(trackCard).toContainText('Playwright Test Game');
  } finally {
    await removeTestTrack(page, audioFileName);
  }
});
