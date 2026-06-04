import { test, expect } from '@playwright/test';
import { generatePlayers, Player } from './helper.js'

test.describe('Host UI', () => {

  let players: Player[] = [];
  let currentInstanceId: string;

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
        state: 'SETUP',
        readyUserIds: []
      }
    });

    // Navigate to the app
    await page.goto('/?mock=true');
  });

  test.afterEach(async ({ request }) => {
    await request.delete(`http://localhost:3001/api/test/instance/${currentInstanceId}`);
  });

  test('should allow host to select another player and transfer host role', async ({ page }) => {
    await expect(page.locator('#host-settings')).toBeVisible();
    await expect(page.locator('#waiting-setup-msg')).toBeHidden();

    const targetPlayer = players[2];
    const dropdown = page.locator('#host-dropdown');
    const listContainer = page.locator('#dropdown-list');
    const transferBtn = page.locator('#btn-confirm-transfer');

    // Open the dropdown
    await dropdown.click();
    await expect(listContainer).toBeVisible();

    // Select the target player from the list
    const playerItem = listContainer.locator(`.dropdown-item[data-id="${targetPlayer.id}"]`);
    await playerItem.click();

    // Verify selection state
    await expect(listContainer).toBeHidden();
    await expect(transferBtn).toBeEnabled();

    // Verify the header updated with the selected player's name
    await expect(dropdown).toContainText(targetPlayer.username);

    // Execute the transfer
    await transferBtn.click();

    // Assertions for the "After" state
    await expect(transferBtn).toHaveText(/transferring/i);

    // Once the backend processes this, the host UI is replaced by the guesser UI
    await expect(page.locator('#host-settings')).toBeHidden();
    await expect(page.locator('#waiting-setup-msg')).toBeVisible();
  });

  test('should allow host to configure game and transfer host using only keyboard', async ({ page }) => {
    await expect(page.locator('#host-settings')).toBeVisible();

    // Configure rounds
    await page.locator('#rounds-input').focus();
    await page.keyboard.press('Control+A');
    await page.keyboard.type('5');

    // Configure track duration
    await page.keyboard.press('Tab');
    await expect(page.locator('#duration-input')).toBeFocused();
    await page.keyboard.press('Control+A');
    await page.keyboard.type('30');

    // Move through joker buttons
    await page.keyboard.press('Tab'); // first joker
    const firstJoker = page.locator('.joker-config-btn').first();
    await expect(firstJoker).toBeFocused();
    await expect(firstJoker).toHaveClass(/\bactive\b/);
    await expect(firstJoker).not.toHaveClass(/\binactive\b/);
    await page.keyboard.press('Space'); // toggle it
    await expect(firstJoker).toHaveClass(/\binactive\b/);
    await expect(firstJoker).not.toHaveClass(/\bactive\b/);

    // Continue tabbing until Advanced Settings button
    while (!(await page.locator('.advanced-toggle-btn').evaluate(
      (el) => el === document.activeElement
    ))) {
      await page.keyboard.press('Tab');
    }

    // Open advanced settings
    await page.keyboard.press('Enter');

    // Time bonus select
    await page.keyboard.press('Tab');
    const timeBonusSelect = page.locator('select');
    const previousValue = await timeBonusSelect.inputValue();
    await page.keyboard.press('ArrowDown');
    const newValue = await timeBonusSelect.inputValue();
    expect(newValue).not.toBe(previousValue);

    // First bonus radio buttons
    await page.keyboard.press('Tab');
    const checkedBefore = await page.locator(
      'input[name="first-bonus"]:checked'
    ).inputValue();
    await page.keyboard.press('ArrowRight');
    const checkedAfter = await page.locator(
      'input[name="first-bonus"]:checked'
    ).inputValue();
    expect(checkedAfter).not.toBe(checkedBefore);

    // Continue until Confirm button
    while (!(await page.locator('#btn-start').evaluate(
      (el) => el === document.activeElement
    ))) {
      await page.keyboard.press('Tab');
    }
    await expect(page.locator('#btn-start')).toBeFocused();

    // Continue to host transfer dropdown
    await page.keyboard.press('Tab');
    const dropdownButton = page.locator('#host-dropdown .dropdown-header');
    await expect(dropdownButton).toBeFocused();

    // Open dropdown
    await page.keyboard.press('Enter');
    const listContainer = page.locator('#dropdown-list');
    await expect(listContainer).toBeVisible();

    // Navigate to third player (players[2])
    await page.keyboard.press('ArrowDown');
    const targetPlayer = players[2];
    const targetItem = listContainer.locator(
      `.dropdown-item[data-id="${targetPlayer.id}"]`
    );
    await expect(targetItem).toBeFocused();

    // Select player
    await page.keyboard.press('Enter');
    await expect(listContainer).toBeHidden();
    await expect(dropdownButton).toContainText(targetPlayer.username);

    // Transfer button
    await page.keyboard.press('Tab');
    const transferBtn = page.locator('#btn-confirm-transfer');
    await expect(transferBtn).toBeFocused();
    await expect(transferBtn).toBeEnabled();

    // Execute transfer
    await page.keyboard.press('Enter');
    await expect(transferBtn).toHaveText(/transferring/i);

    // Host becomes non-host
    await expect(page.locator('#host-settings')).toBeHidden();
    await expect(page.locator('#waiting-setup-msg')).toBeVisible();
  });
});