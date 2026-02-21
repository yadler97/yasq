import { test, expect } from '@playwright/test';

const INSTANCE_ID = '123456789';
const MOCK_PLAYER_1_ID = '999999999'
const MOCK_PLAYER_2_ID = '111111111';

test.describe('Host UI', () => {

  test.beforeEach(async ({ page, request }) => {
    // Navigate to the app
    await page.goto('/?mock=true');

    // Register MockPlayer1 (Host)
    await request.post('http://localhost:3001/api/register', {
      data: { 
        instanceId: INSTANCE_ID, 
        userId: MOCK_PLAYER_1_ID, 
        username: 'MockPlayer1' 
      }
    });

    // Register MockPlayer2
    await request.post('http://localhost:3001/api/register', {
      data: { 
        instanceId: INSTANCE_ID, 
        userId: MOCK_PLAYER_2_ID, 
        username: 'MockPlayer2' 
      }
    });

    // Ensure MockPlayer2 is not ready yet
    await page.request.post('http://localhost:3001/api/ready', {
      data: { instanceId: INSTANCE_ID, userId: MOCK_PLAYER_2_ID, ready: false }
    });
  });

  test('should toggle start button based on participant ready-state updates', async ({ page }) => {
    // Check for the Start Game button
    const startBtn = page.locator('#btn-start');
    await expect(startBtn).toBeVisible();
    await expect(startBtn).toBeDisabled();

    // MockPlayer2 is ready
    await page.request.post('http://localhost:3001/api/ready', {
      data: { instanceId: INSTANCE_ID, userId: MOCK_PLAYER_2_ID, ready: true }
    });

    // Button enabled when all players are ready
    await expect(startBtn).toBeEnabled();

    // MockPlayer2 is no longer ready
    await page.request.post('http://localhost:3001/api/ready', {
      data: { instanceId: INSTANCE_ID, userId: MOCK_PLAYER_2_ID, ready: false }
    });

    // Button disabled again
    await expect(startBtn).toBeDisabled();
  });
});