import { Page, Locator } from '@playwright/test';

export class Sidebar {
  constructor(private readonly page: Page) {}

  getPlayerRow(username: string): Locator {
    return this.page.locator(`.player-entry:has-text("${username}")`);
  }

  getBadge(username: string, type: 'host' | 'ready' | 'guessed' | 'winner'): Locator {
    return this.getPlayerRow(username).locator(`.badge.${type}`);
  }
}