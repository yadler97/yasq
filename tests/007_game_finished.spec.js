import { test, expect } from '@playwright/test';
import { generatePlayers } from './helper.js'
import { mockLeaderboard } from '../mock_data/mockLeaderboard.js';

test.describe('Player UI', () => {

  let players = [];
  let currentInstanceId;

  test.beforeEach(async ({ page, request }, testInfo) => {
    currentInstanceId = `test-instance-${testInfo.testId}`;
    const playerCount = 4;
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
        registeredUsers: players,
        hostId: players[0].id,
        state: 'GAME_FINISHED',
        leaderboard: mockLeaderboard,
        lastWinnerId: players[1].id
      }
    });

    await page.goto('/?mock=true');
  });

  test('should display final leaderboard with correct scores and round history', async ({ page }) => {
    // Verify total count
    const playerCards = page.locator('.player-card');
    await expect(playerCards).toHaveCount(3);

    // Check the Last Entry (Rank #3)
    const thirdPlace = playerCards.last();
    await expect(thirdPlace).not.toHaveClass(/winner/);
    await expect(thirdPlace.locator('.rank')).toHaveText('#3');
    await expect(thirdPlace.locator('.name')).toContainText('MockPlayer3');
    await expect(thirdPlace.locator('.total-score')).toContainText('0 pts');
    await expect(thirdPlace.locator('.round-bubble.incorrect')).toHaveCount(3);

    const wrongBubble = thirdPlace.locator('.round-bubble').nth(0);
    await expect(wrongBubble).toHaveClass(/incorrect/);
    await expect(wrongBubble).toContainText('0');

    // Check the Middle Entry (Rank #2)
    const secondPlace = playerCards.nth(1);
    await expect(secondPlace).not.toHaveClass(/winner/);
    await expect(secondPlace.locator('.rank')).toHaveText('#2');
    await expect(secondPlace.locator('.name')).toContainText('MockPlayer2');
    await expect(secondPlace.locator('.total-score')).toContainText('421 pts');

    // Check the Winner (Rank #1)
    const firstPlace = playerCards.first();
    await expect(firstPlace).toHaveClass(/winner/);
    await expect(firstPlace.locator('.rank')).toHaveText('#1');
    await expect(firstPlace.locator('.name')).toContainText('MockPlayer1');
    await expect(firstPlace.locator('.total-score')).toContainText('585 pts');

    const winnerBubbles = firstPlace.locator('.round-bubble');
    await expect(winnerBubbles).toHaveCount(3);
    await expect(winnerBubbles.first()).toHaveClass(/correct/);
    await expect(winnerBubbles.first()).toHaveClass(/first/);
    await expect(winnerBubbles.nth(2)).toHaveClass(/correct/);
    await expect(winnerBubbles.nth(2)).not.toHaveClass(/first/);

    // Verify we don't see the host UI
    await expect(page.locator('.waiting-msg')).toContainText('Waiting for host');
    await expect(page.locator('#btn-restart')).not.toBeVisible();
  });

  test('should display winner badge in player list', async ({ page }) => {
    // Check for the WINNER badge
    const winnerEntry = page.locator(`.player-entry:has-text("${players[1].username}")`);
    await expect(winnerEntry.locator('.badge.winner')).toBeVisible();
    await expect(winnerEntry.locator('.badge.winner')).toHaveText('👑');
  });
});