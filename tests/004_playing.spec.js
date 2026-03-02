import { test, expect } from '@playwright/test';
import { generatePlayers } from './helper.js'

test.describe('Player UI', () => {

  let players = [];
  let currentInstanceId;

  test.beforeEach(async ({ page, request }, testInfo) => {
    currentInstanceId = `test-instance-${testInfo.testId}`;
    const playerCount = 3;
    players = generatePlayers(playerCount);
    const user = players[1];

    await page.addInitScript(({ allPlayers, user, instanceId }) => {
      window.__MOCK_PARTICIPANTS__ = allPlayers;
      window.__MOCK_USER_ID__ = user.id;
      window.__MOCK_USER_NAME__ = user.username;
      window.__MOCK_INSTANCE_ID__ = instanceId;
    }, { allPlayers: players, user: user, instanceId: currentInstanceId });

    await request.post('http://localhost:3001/api/test/setup-session', {
      data: {
        instanceId: currentInstanceId,
        hostId: players[0].id,
        registeredUsers: players,
        state: 'PLAYING',
        readyUserIds: [],
        settings: {
          rounds: 5,
          trackDuration: 30000,
          enabledJokers: ['OBFUSCATION', 'TRIVIA', 'MULTIPLE_CHOICE'] 
        },
        trackInfo: {
          track: {
            name: 'Game A',
            title: 'Track A',
            tags: [
              { 'type': 'platform', 'value': 'Platform A'},
              { 'type': 'release', 'value': '2026'}
            ]
          }
        },
      }
    });

    // Navigate to the app
    await page.goto('/?mock=true');
  });

  test.afterEach(async ({ request }) => {
    await request.delete(`http://localhost:3001/api/test/instance/${currentInstanceId}`);
  });

  test('should show wait message after submitting a guess', async ({ page }) => {
    const guessInput = page.locator('#guess-input');
    const submitBtn = page.locator('#btn-submit');
    const waitMessage = page.locator('#waiting-msg');

    // Playing UI visible as expected
    await expect(guessInput).toBeVisible();
    await expect(submitBtn).toBeVisible();
    await expect(waitMessage).toBeHidden();

    // Submit a guess
    await guessInput.fill('Game XY');
    await submitBtn.click();

    // Verify UI state change
    await expect(guessInput).toBeHidden();
    await expect(submitBtn).toBeHidden();
    await expect(waitMessage).toBeVisible();
    await expect(waitMessage).toHaveText(/wait/i);
  });

  test('should switch to next state once all players have submitted a guess', async ({ page, request }) => {
    const guessInput = page.locator('#guess-input');
    const submitBtn = page.locator('#btn-submit');
    const gameArena = page.locator('#game-arena');
    const resultsUI = page.locator('#results');

    // Other player submits guess
    await request.post('http://localhost:3001/api/guess', {
      data: {
        instanceId: currentInstanceId,
        userId: players[2].id,
        guess: 'Some Game'
      }
    });

    // Submit own guess
    await guessInput.fill('Game XY');
    await submitBtn.click();

    // Verify UI state change
    await expect(resultsUI).toBeVisible();
    await expect(gameArena).toBeHidden();
  });

  test('should display obfuscated hint when using obfuscation joker', async ({ page }) => {
    const jokerBtn = page.locator('#btn-joker-obfuscation');
    const hintText = page.locator('#obfuscation-hint-text');

    // Activate joker
    await jokerBtn.click();

    // Verify UI change
    await expect(jokerBtn).toBeDisabled();
    await expect(hintText).toBeVisible();
    const validChars = /^[a-zA-Z0-9_\s\-!:'?]+$/;
    const text = await hintText.innerText();
    await expect(text).toMatch(validChars);
  });

  test('should display trivia hint when using tags joker', async ({ page }) => {
    const jokerBtn = page.locator('#btn-joker-trivia');
    const tagsContainer = page.locator('.tags-container');
    const tagBadges = page.locator('.tag-badge');

    // Activate joker
    await jokerBtn.click();

    // Verify UI change
    await expect(tagsContainer).toBeVisible();
    await expect(tagBadges).toHaveCount(2);

    // Verify platform tag
    const platformTag = page.locator('.tag-badge', { hasText: 'platform' });
    await expect(platformTag).toContainText('Platform A');

    // Verify release tag
    const releaseTag = page.locator('.tag-badge', { hasText: 'release' });
    await expect(releaseTag).toContainText('2026');
  });

  test('should display 4 multiple choice buttons when using mc joker', async ({ page }) => {
    const jokerBtn = page.locator('#btn-joker-multiple-choice');
    const choiceButtons = page.locator('.choice-button');
    const guessInput = page.locator('#guess-input');
    const waitMessage = page.locator('#waiting-msg');

    // Activate joker
    await jokerBtn.click();

    // Verify UI state
    await expect(jokerBtn).toBeDisabled();
    await expect(choiceButtons).toHaveCount(4);

    // Verify uniqueness (none of the buttons should have the same text)
    const texts = await choiceButtons.allInnerTexts();
    const uniqueTexts = new Set(texts);
    expect(uniqueTexts.size).toBe(4);

    // Test Interaction: Click the first choice
    await choiceButtons.first().click();

    // Verify guess successfully submitted
    await expect(guessInput).toBeHidden();
    await expect(waitMessage).toBeVisible();
    await expect(waitMessage).toHaveText(/wait/i);
  });
});