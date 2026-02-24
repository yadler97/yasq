import { test, expect } from '@playwright/test';
import { generatePlayers } from './helper.js'

test.describe('Host UI', () => {

  let players = [];
  let currentInstanceId;

  test.beforeEach(async ({ page, request }, testInfo) => {
    currentInstanceId = `test-instance-${testInfo.testId}`;
    const playerCount = 3;
    players = generatePlayers(playerCount);
    const user = players[0];

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
        state: 'TRACK_SELECTION',
        readyUserIds: [] 
      }
    });

    // Navigate to the app
    await page.goto('/?mock=true');
  });

  test.afterEach(async ({ request }) => {
    await request.delete(`http://localhost:3001/api/test/instance/${currentInstanceId}`);
  });

  test('should show track selection', async ({ page }) => {
    const selectionTitle = page.locator('h2:has-text("Select the next track to challenge players:")');
    await expect(selectionTitle).toBeVisible();

    // Verify the list of tracks is rendered
    const trackList = page.locator('#track-selection-grid');
    await expect(trackList).toBeVisible();

    // Verify there are track items
    const trackItems = trackList.locator('button');
    const count = await trackItems.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should move to next state when clicking on track', async ({ page }) => {
    const trackButtons = page.locator('#track-selection-grid button');
    await expect(trackButtons.first()).toBeVisible();

    // Click the first track
    await trackButtons.first().click();

    // Verify the state transition in the UI
    const selectionTitle = page.locator('h2:has-text("Select the next track to challenge players:")');
    await expect(selectionTitle).toBeHidden();
    const waitingTitle = page.locator('h2:has-text("Waiting for players to submit their guesses...")');
    await expect(waitingTitle).toBeVisible();
    const progressBar = page.locator('#progress-bar');
    await expect(progressBar).toBeVisible();
  });
});