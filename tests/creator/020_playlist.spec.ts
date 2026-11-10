import { expect, test } from './test_setup.js';

test.use({ creatorDataFixture: 'single-track' });

test('should create a playlist with a fixture track', async ({ playlistPage }, testInfo) => {
  const playlistName = `Playwright Playlist ${testInfo.testId.replace(/[^a-zA-Z0-9_-]/g, '-')}`;

  await playlistPage.goto('/playlists');
  await playlistPage.addPlaylistButton.click();
  await expect(playlistPage.playlistForm.getByRole('heading', { name: 'Add New Playlist' })).toBeVisible();
  await playlistPage.playlistNameInput.fill(playlistName);
  await expect(playlistPage.trackCheckboxes).toHaveCount(1);
  await playlistPage.trackCheckboxes.check();
  await playlistPage.savePlaylistButton.click();

  await expect(playlistPage.getPlaylistCard(playlistName)).toContainText('1 tracks included');
});
