import { Page, Locator } from '@playwright/test';
import { BasePage } from '../BasePage';

type BadgeType = 'host' | 'ready' | 'guessed' | 'winner' | 'streak';

export class Sidebar extends BasePage {
  constructor(page: Page) {
    super(page);
  }

  private getPlayerRow(username: string): Locator {
    return this.page.locator(`.player-entry:has-text("${username}")`);
  }

  getBadge(username: string, type: BadgeType): Locator {
    return this.getPlayerRow(username).locator(`.badge.${type}`);
  }
}
