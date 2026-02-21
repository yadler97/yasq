import { test, expect } from '@playwright/test';
import { generatePlayers } from './helper.js'

const INSTANCE_ID = '123456789';

test.describe('Host UI', () => {

  let players = [];

  test.beforeEach(async ({ page, request }) => {
    const playerCount = 3;
    players = generatePlayers(playerCount);
    const host = players[0];

    await page.addInitScript(({ allPlayers, host }) => {
      window.__MOCK_PARTICIPANTS__ = allPlayers;
      window.__MOCK_USER_ID__ = host.id;
      window.__MOCK_USER_NAME__ = host.username;
    }, { allPlayers: players, host: host });

    // Register all players on the Backend
    for (const player of players) {
      await request.post('http://localhost:3001/api/register', {
        data: { 
          instanceId: INSTANCE_ID, 
          userId: player.id, 
          username: player.username 
        }
      });

      // Ensure they all start as 'not ready'
      await request.post('http://localhost:3001/api/ready', {
        data: { instanceId: INSTANCE_ID, userId: player.id, ready: false }
      });
    }

    // Navigate to the app
    await page.goto('/?mock=true');
  });

  test('should toggle start button based on participant ready-state updates', async ({ page }) => {
    // Check for the Start Game button
    const startBtn = page.locator('#btn-start');
    await expect(startBtn).toBeVisible();
    await expect(startBtn).toBeDisabled();

    // MockPlayer1 is ready
    await page.request.post('http://localhost:3001/api/ready', {
      data: { instanceId: INSTANCE_ID, userId: players[1].id, ready: true }
    });

    // Not all players ready yet
    await expect(startBtn).toBeDisabled();

    // MockPlayer2 is ready
    await page.request.post('http://localhost:3001/api/ready', {
      data: { instanceId: INSTANCE_ID, userId: players[2].id, ready: true }
    });

    // Button enabled when all players are ready
    await expect(startBtn).toBeEnabled();

    // MockPlayer2 is no longer ready
    await page.request.post('http://localhost:3001/api/ready', {
      data: { instanceId: INSTANCE_ID, userId: players[2].id, ready: false }
    });

    // Button disabled again
    await expect(startBtn).toBeDisabled();
  });
});