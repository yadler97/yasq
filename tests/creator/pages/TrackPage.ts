import { Locator, Page } from '@playwright/test';
import { CreatorPage } from './CreatorPage';

export class TrackPage extends CreatorPage {
  readonly addTrackButton: Locator;
  readonly trackCards: Locator;
  readonly trackForm: Locator;
  readonly gameNameInput: Locator;
  readonly trackTitleInput: Locator;
  readonly audioFileInput: Locator;
  readonly addTagButton: Locator;
  readonly saveTrackButton: Locator;

  constructor(page: Page) {
    super(page);
    this.addTrackButton = page.getByRole('button', { name: '+ Add Track' });
    this.trackCards = page.locator('.tracks-container .track-card');
    this.trackForm = page.locator('form.creator-form');
    this.gameNameInput = page.getByLabel('Game Name');
    this.trackTitleInput = page.getByLabel('Track Title');
    this.audioFileInput = page.getByLabel('Audio File');
    this.addTagButton = page.getByRole('button', { name: '+ Add Tag' });
    this.saveTrackButton = page.getByRole('button', { name: 'Save Track' });
  }

  getTagTypeInput(index = 0): Locator {
    return this.page.getByPlaceholder('Type').nth(index);
  }

  getTagValueInput(index = 0): Locator {
    return this.page.getByPlaceholder('Value').nth(index);
  }

  getTrackCard(title: string): Locator {
    return this.trackCards.filter({ hasText: title });
  }
}
