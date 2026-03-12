import { test, expect } from '@playwright/test';
import { generatePlayers } from './helper.js'

test.describe('Player UI', () => {

  let players = [];
  let currentInstanceId;

  test.beforeEach(async ({ page, request }, testInfo) => {
    currentInstanceId = `test-instance-${testInfo.testId}`;
    const playerCount = 5;
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
        state: 'RESULTS',
        currentRound: 1,
        trackInfo: {
          track: {
            name: 'Game A',
            title: 'Track A',
            tags: [
              { type: "platform", value: "Platform A" },
              { type: "release", value: "2026" }
            ]
          }
        },
        readyUserIds: [] 
      }
    });

    await page.goto('/?mock=true');
  });

  test.afterEach(async ({ request }) => {
    await request.delete(`http://localhost:3001/api/test/instance/${currentInstanceId}`);
  });

  test('should display correct status and points earned', async ({ page, request }) => {
    // User submitted correct guess
    await request.patch(`/api/test/instance/${currentInstanceId}`, {
      data: {
        leaderboard: {
          entries: [{
            userId: players[1].id,
            roundHistory: [{ round: 1, scoreValue: 1, points: 100, guess: "Game A" }]
          }]
        }
      }
    });

    // Verify the Round Summary display
    const resultsContainer = page.locator('#results');
    await expect(resultsContainer.locator('h2')).toContainText('Round 1 Results');
    
    // Check for the correct answer text from trackInfo
    await expect(resultsContainer).toContainText('Game A');
    await expect(resultsContainer).toContainText('Track A');

    const tagsContainer = resultsContainer.locator('.tags-container');
    const tagBadges = tagsContainer.locator('.tag-badge');

    // Verify total tag count
    await expect(tagBadges).toHaveCount(2);

    // Verify first tag (Platform)
    const platformTag = tagBadges.first();
    await expect(platformTag).toHaveText('Platform A');
    await expect(platformTag).toHaveAttribute('title', 'Platform');

    // Verify second tag (Release)
    const releaseTag = tagBadges.nth(1);
    await expect(releaseTag).toHaveText('2026');
    await expect(releaseTag).toHaveAttribute('title', 'Release');

    // Verify own result
    const personalResult = page.locator('.own-results');
    await expect(personalResult.locator('.result.correct')).toContainText('Correct! 🎉');
    await expect(personalResult).toContainText('Your guess: Game A');
    await expect(personalResult).toContainText('You earned 100 points');
  });

  test('should display partial correct status and points earned', async ({ page, request }) => {
    // User submitted incorrect guess
    await request.patch(`/api/test/instance/${currentInstanceId}`, {
      data: {
        leaderboard: {
          entries: [{
            userId: players[1].id,
            roundHistory: [{ round: 1, scoreValue: 0.5, points: 50, guess: "Game A2" }]
          }]
        }
      }
    });

    // Verify the Round Summary display
    const resultsContainer = page.locator('#results');
    await expect(resultsContainer.locator('h2')).toContainText('Round 1 Results');
    
    // Check for the correct answer text from trackInfo
    await expect(resultsContainer).toContainText('Game A');
    await expect(resultsContainer).toContainText('Track A');

    // Verify own result
    const personalResult = page.locator('.own-results');
    await expect(personalResult.locator('.result.partial')).toContainText('So close! 🧗');
    await expect(personalResult).toContainText('Your guess: Game A2');
    await expect(personalResult).toContainText('You earned 50 points');
  });

  test('should display incorrect status and zero points', async ({ page, request }) => {
    // User submitted incorrect guess
    await request.patch(`/api/test/instance/${currentInstanceId}`, {
      data: {
        leaderboard: {
          entries: [{
            userId: players[1].id,
            roundHistory: [{ round: 1, scoreValue: 0, points: 0, guess: "Game B" }]
          }]
        }
      }
    });

    // Verify the Round Summary display
    const resultsContainer = page.locator('#results');
    await expect(resultsContainer.locator('h2')).toContainText('Round 1 Results');
    
    // Check for the correct answer text from trackInfo
    await expect(resultsContainer).toContainText('Game A');
    await expect(resultsContainer).toContainText('Track A');

    // Verify own result
    const personalResult = page.locator('.own-results');
    await expect(personalResult.locator('.result.incorrect')).toContainText('Incorrect. 😢');
    await expect(personalResult).toContainText('Your guess: Game B');
    await expect(personalResult).toContainText('You earned 0 points');
  });

  test('should display ready button and toggle status', async ({ page, request }) => {
    // User submitted correct guess
    await request.patch(`/api/test/instance/${currentInstanceId}`, {
      data: {
        leaderboard: {
          entries: [{
            userId: players[1].id,
            roundHistory: [{ round: 1, scoreValue: 1, points: 100, guess: "Game A" }]
          }]
        }
      }
    });

    // Ready Up Interaction
    const readyBtn = page.locator('.lobby-btn');
    await expect(readyBtn).toHaveText('Ready Up');
    await readyBtn.click();
    
    // Verify local UI update
    await expect(readyBtn).toHaveText("I'm Ready! ✅");
    await expect(readyBtn).toHaveClass(/ready/);

    // Verify badge displayed
    const localPlayerRow = page.locator(`.player-entry:has-text("${players[1].username}")`);
    await expect(localPlayerRow.locator('.badge.ready')).toBeVisible();
  });

  test('should display correct number of correct guesses', async ({ page, request }) => {
    await request.patch(`/api/test/instance/${currentInstanceId}`, {
      data: {
        leaderboard: {
          entries: [
            // Player 1: Correct (scoreValue 1)
            { 
              userId: players[1].id, 
              roundHistory: [{ round: 1, scoreValue: 1, points: 100, guess: "Game A" }] 
            },
            // Player 2: Partial (scoreValue 0.5)
            { 
              userId: players[2].id, 
              roundHistory: [{ round: 1, scoreValue: 0.5, points: 50, guess: "Game A2" }] 
            },
            // Player 3: Wrong (scoreValue 0)
            { 
              userId: players[3].id, 
              roundHistory: [{ round: 1, scoreValue: 0, points: 0, guess: "Game B" }] 
            },
            // Player 4: Correct (scoreValue 1)
            { 
              userId: players[4].id, 
              roundHistory: [{ round: 1, scoreValue: 1, points: 100, guess: "Game A" }] 
            }
          ]
        }
      }
    });

    const personalResult = page.locator('.own-results');
    await expect(personalResult).toContainText('Number of correct players: 2');
  });
});