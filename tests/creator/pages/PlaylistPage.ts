import { Locator, Page } from '@playwright/test';
import { CreatorPage } from './CreatorPage';

export class PlaylistPage extends CreatorPage {
  readonly addPlaylistButton: Locator;
  readonly playlistCards: Locator;
  readonly playlistForm: Locator;
  readonly playlistNameInput: Locator;
  readonly trackCheckboxes: Locator;
  readonly savePlaylistButton: Locator;

  constructor(page: Page) {
    super(page);
    this.addPlaylistButton = page.getByRole('button', { name: '+ Add Playlist' });
    this.playlistCards = page.locator('.playlists-container .playlist-card');
    this.playlistForm = page.locator('form.creator-form');
    this.playlistNameInput = page.getByLabel('Playlist Name');
    this.trackCheckboxes = page.locator('.playlist-track-selector input[type="checkbox"]');
    this.savePlaylistButton = page.getByRole('button', { name: 'Save Playlist' });
  }

  getPlaylistCard(name: string): Locator {
    return this.playlistCards.filter({ hasText: name });
  }
}
