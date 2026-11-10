import { expect, test } from './test_setup.js';

test.describe('Track Creation', () => {
  test('should create a track with a tag', async ({ trackPage }) => {
    await trackPage.goto('/tracks');
    await trackPage.addTrackButton.click();
    await expect(trackPage.trackForm.getByRole('heading', { name: 'Add New Track' })).toBeVisible();

    await trackPage.gameNameInput.fill('Game A');
    await trackPage.trackTitleInput.fill('Track A');
    await trackPage.audioFileInput.setInputFiles({
      name: 'test-audio.mp3',
      mimeType: 'audio/mpeg',
      buffer: Buffer.from('test audio'),
    });
    await trackPage.addTagButton.click();
    await trackPage.getTagTypeInput().fill('platform');
    await trackPage.getTagValueInput().fill('Platform A');
    await trackPage.saveTrackButton.click();

    const trackCard = trackPage.getTrackCard('Game A');
    await expect(trackCard).toContainText('Track A');
  });
});

test.describe('Track Edit/Delete', () => {
  test.use({ creatorDataFixture: 'single-track' });

  test('should edit a track', async ({ trackPage }) => {
    await trackPage.goto('/tracks');
    const trackCard = trackPage.getTrackCard('Game A');
    await trackCard.getByRole('button', { name: 'Edit' }).click();
    await expect(trackPage.trackForm.getByRole('heading', { name: 'Edit Track' })).toBeVisible();

    await trackPage.gameNameInput.fill('Game B');
    await trackPage.trackTitleInput.fill('Track B');
    await trackPage.updateTrackButton.click();

    const updatedTrackCard = trackPage.getTrackCard('Game B');
    await expect(updatedTrackCard).toContainText('Track B');
  });

  test('should delete a track', async ({ page, trackPage }) => {
    await trackPage.goto('/tracks');
    const trackCard = trackPage.getTrackCard('Game A');

    const dialogMessage = page.waitForEvent('dialog').then(async dialog => {
      const message = dialog.message();
      await dialog.accept();
      return message;
    });
    await trackCard.getByRole('button', { name: 'Delete' }).click();
    expect(await dialogMessage).toBe('Are you sure you want to delete this track?');

    await expect(trackPage.getTrackCard('Game A')).toHaveCount(0);
  });
});

test.describe('Track Filtering', () => {
  test.use({ creatorDataFixture: 'multiple-tracks' });

  test('should filter tracks by game name', async ({ trackPage }) => {
    await trackPage.goto('/tracks');
    await expect(trackPage.trackCards).toHaveCount(3);

    await trackPage.searchInput.fill('Game B');
    await expect(trackPage.trackCards).toHaveCount(1);

    await trackPage.clearSearchButton.click();
    await expect(trackPage.searchInput).toHaveValue('');
    await expect(trackPage.trackCards).toHaveCount(3);
  });

  test('should filter tracks by tag', async ({ trackPage }) => {
    await trackPage.goto('/tracks');
    await expect(trackPage.trackCards).toHaveCount(3);

    const platformCategory = trackPage.getTagCategory('platform');
    await platformCategory.locator('.tag-category-header').click();
    await trackPage.getTagCheckbox('Platform B').check();

    await expect(trackPage.trackCards).toHaveCount(2);
    await expect(trackPage.getTrackCard('Game B')).toBeVisible();
    await expect(trackPage.getTrackCard('Game C')).toBeVisible();
    await expect(trackPage.getTrackCard('Game A')).toBeHidden();

    await trackPage.clearTagFiltersButton.click();
    await expect(trackPage.getTagCheckbox('Platform B')).not.toBeChecked();
    await expect(trackPage.trackCards).toHaveCount(3);
  });
});
