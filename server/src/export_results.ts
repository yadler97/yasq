import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { capitalize, getAvatarUrl, getDisplayName, type Participant } from '@yasq/shared';
import type { Leaderboard, LeaderboardEntry, RoundResult } from './models/leaderboard.js';
import { LogCategory, logger } from './utils/logger.js';
import type { GameStats } from './models/game_stats.js';
import type { AchievementBonusManager } from './models/achievement_bonus.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function isPlaywrightExecutableInstalled(): boolean {
  try {
    const executablePath = chromium.executablePath();
    return fs.existsSync(executablePath);
  } catch {
    return false;
  }
}

function getGameDuration(startTime?: number, endTime?: number): string {
  if (!startTime || !endTime) return 'N/A';
  const diffSecs = Math.floor((endTime - startTime) / 1000);
  const mins = Math.floor(diffSecs / 60);
  const secs = diffSecs % 60;
  return `${mins}m ${secs}s`;
}

function formatSubValue(state: any): string {
  if (!state.value && state.value !== 0) return '';

  if (state.rule && state.rule.metric === 'guessTime') {
    return `⌚ ${state.value}s`;
  }

  if (state.rule && state.rule.metric === 'streak') {
    return `🔥 ${state.value}`;
  }

  return `${state.value} pts`;
}

export async function generateResultsImage(
  instanceId: string,
  tempDir: string,
  leaderboardData: Leaderboard,
  userData: Map<string, Participant>,
  gameStats: GameStats,
  achievementBonusManager: AchievementBonusManager
) {
  if (!isPlaywrightExecutableInstalled()) {
    logger.warn(
      `Playwright Chromium executable not found. Skipping results image generation. Please run 'npx playwright install chromium'.`,
      LogCategory.GAME,
      instanceId
    );
    return;
  }

  const outputPath = path.join(tempDir, 'results.png');
  const cssFilePath = path.join(__dirname, '../../client/src/style.css');
  let cssContent = '';
  try {
    cssContent = fs.readFileSync(cssFilePath, 'utf8');
  } catch (err: unknown) {
    logger.error(`Could not load client-side stylesheet`, LogCategory.GAME, instanceId, err as Error);
  }

  const currentDateFormatted = new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(new Date());

  const entries = leaderboardData.getAll();

  const highestTimeBonus = gameStats.bestScoringRound?.timeBonusSum ?? 0;
  const leastTimeBonus = gameStats.leastScoringRound?.timeBonusSum ?? 0;

  const achievementEntries = achievementBonusManager ? Object.entries(achievementBonusManager) : [];

  const statItems = [
    {
      label: 'Duration',
      users: [] as Participant[],
      value: getGameDuration(gameStats.startTime ?? undefined, gameStats.endTime ?? undefined),
      subValue: '',
    },
    {
      label: 'Best Round',
      users: [] as Participant[],
      value: gameStats.bestScoringRound ? `Round ${gameStats.bestScoringRound.roundResults[0]?.round || 'N/A'}` : 'N/A',
      subValue: `${highestTimeBonus} pts`,
    },
    {
      label: 'Least Round',
      users: [] as Participant[],
      value: gameStats.leastScoringRound
        ? `Round ${gameStats.leastScoringRound.roundResults[0]?.round || 'N/A'}`
        : 'N/A',
      subValue: `${leastTimeBonus} pts`,
    },
    ...achievementEntries.map(([ruleId, state]: [string, any]) => {
      const users = (state.userIds || [])
        .map((id: string) => userData.get(id))
        .filter((u: any): u is Participant => u !== undefined);
      const ruleName = capitalize(ruleId);

      return {
        label: ruleName,
        users,
        value: users.length > 0 ? users.map((u: Participant) => getDisplayName(u)) : ['None'],
        subValue: formatSubValue(state),
      };
    }),
  ];

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <style>
          /* 1. Inject CSS rules */
          ${cssContent};

          /* 2. Overwrite and flatten variables and animation nodes */
          body {
            margin: 0;
            padding: 20px;
            display: flex;
            justify-content: center;
            align-items: center;
          }

          /* Force CSS Grid properties out of transitioning state */
          .player-wrapper {
            grid-template-rows: unset !important;
            display: block !important;
            overflow: visible !important;
            margin-bottom: 12px !important;
            animation: none !important;
          }

          /* Force opacity transitions and hide the continuous moving winner shimmer line */
          .player-card {
            opacity: 1 !important;
            animation: none !important;
          }

          .player-card.winner::after {
            display: none !important;
            animation: none !important;
          }

          .round-bubble {
            transform: none !important;
            transition: none !important;
          }
        </style>
      </head>
      <body>
        <div class="final-leaderboard centered">
          <h1 class="results-title">🏆 Final Results</h1>
          <div class="leaderboard-container">
            ${entries
              .map((player: LeaderboardEntry, index: number) => {
                const isWinner = index === 0;
                const user = userData.get(player.userId);
                const userName = user ? getDisplayName(user) : 'Unknown';
                const achievements = Array.from(player.achievementBonuses?.entries() || []);

                return `
                <div class="player-wrapper">
                  <div class="player-card ${isWinner ? 'winner' : ''}">
                    <div class="player-main-info">
                      <div class="rank">#${index + 1}</div>
                      <img src="${getAvatarUrl(user!)}" alt="Avatar of ${userName}" class="avatar-small" draggable="false" />
                      <div class="name">${isWinner ? '👑 ' : ''}${userName}</div>

                      ${
                        achievements.length > 0
                          ? `
                        <div class="player-achievements">
                          ${achievements
                            .map(([achievementId, points]: [string, number]) => {
                              const icon =
                                achievementId === 'HIGHEST_STREAK'
                                  ? '🔥'
                                  : achievementId === 'FASTEST_CORRECT_GUESS'
                                    ? '⌚'
                                    : '🏆';
                              return `
                              <div class="badge winner">
                                ${icon} +${points}
                              </div>
                              `;
                            })
                            .join('')}
                        </div>
                      `
                          : ''
                      }

                      <div class="total-score">${player.totalScore} pts</div>
                    </div>

                    <div class="history-grid">
                      <div class="history-label">Round Breakdown:</div>
                      <div class="round-bubbles">
                        ${player.roundHistory
                          .map((r: RoundResult) => {
                            const statusClass =
                              r.scoreValue > 0.5 ? 'correct' : r.scoreValue === 0.5 ? 'partial' : 'incorrect';
                            return `
                              <div class="round-bubble ${statusClass} ${r.isFirst ? 'first' : ''}">
                                ${r.points}
                              </div>
                            `;
                          })
                          .join('')}
                      </div>
                    </div>
                  </div>
                </div>
              `;
              })
              .join('')}
          </div>

          <div class="game-stats">
            <h2>📊 Game Highlights</h2>
            <div class="game-stats-grid">
              ${statItems
                .map(item => {
                  const users = item.users || [];
                  const values = Array.isArray(item.value) ? item.value : [item.value];

                  return `
                  <div class="game-stat-item">
                    <span class="game-stat-label">${item.label}</span>
                    ${
                      users.length > 0
                        ? users
                            .map((user: Participant, uIndex: number) => {
                              const userName = getDisplayName(user);
                              const avatarUrl = getAvatarUrl(user);
                              const displayValue = values[uIndex] || userName;
                              return `
                            <div class="game-stat-content">
                              <img src="${avatarUrl}" alt="Avatar of ${userName}" class="avatar-small" draggable="false" style="width: 20px; height: 20px; border-radius: 50%;" />
                              <strong class="game-stat-value">${displayValue}</strong>
                            </div>
                          `;
                            })
                            .join('')
                        : `
                        <div class="game-stat-content">
                          <strong class="game-stat-value">${item.value}</strong>
                        </div>
                      `
                    }
                    ${item.subValue ? `<span class="game-stat-subvalue">${item.subValue}</span>` : ''}
                  </div>
                `;
                })
                .join('')}
            </div>
          </div>

          <p>${currentDateFormatted}</p>
        </div>
      </body>
    </html>
  `;

  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({
      viewport: { width: 650, height: 400 },
      deviceScaleFactor: 2,
      colorScheme: 'dark',
    });
    const page = await context.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle' });

    const elementLocator = page.locator('.final-leaderboard');
    const imageBuffer = await elementLocator.screenshot({ type: 'png' });

    // Store image in local temp dir
    fs.writeFileSync(outputPath, imageBuffer);
    logger.debug(`Successfully stored image file to: ${outputPath}`, LogCategory.GAME, instanceId);
  } finally {
    await browser.close();
  }
}
