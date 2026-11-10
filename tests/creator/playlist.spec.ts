import { expect, test } from '@playwright/test';
import { PlaylistPage } from './pages/PlaylistPage';

async function removeTestPlaylist(page: import('@playwright/test').Page, name: string) {
  const response = await page.request.get('/api/playlists');
  expect(response.ok()).toBeTruthy();

  const playlists: Array<{ name: string }> = await response.json();
  for (let index = playlists.length - 1; index >= 0; index--) {
    if (playlists[index].name === name) {
      const deleteResponse = await page.request.delete(`/api/playlists/${index}`);
      expect(deleteResponse.status()).toBe(204);
    }
  }
}

test('creates a playlist', async ({ page }, testInfo) => {
  const playlistName = `Playwright Playlist ${testInfo.testId.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
  const playlistPage = new PlaylistPage(page);

  await removeTestPlaylist(page, playlistName);
  try {
    await playlistPage.goto('/playlists');
    await playlistPage.addPlaylistButton.click();
    await expect(playlistPage.playlistForm.getByRole('heading', { name: 'Add New Playlist' })).toBeVisible();
    await playlistPage.playlistNameInput.fill(playlistName);
    await expect(playlistPage.trackCheckboxes).toHaveCount(0);
    await playlistPage.savePlaylistButton.click();

    await expect(playlistPage.getPlaylistCard(playlistName)).toContainText('0 tracks included');
  } finally {
    await removeTestPlaylist(page, playlistName);
  }
});
