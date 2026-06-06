import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';

import { generateResultsImage, temporaryDirectory } from './export_results.js';
import type { Participant } from './helper.js';

const mockUserData = new Map<string, Participant>([
  ['1', { id: '1', username: 'Player One' }],
  ['2', { id: '2', username: 'Player Two' }],
  ['3', { id: '3', username: 'Player Three' }]
]);

describe('Playwright Local Rendering System Test', () => {
  const instanceId = "1";
  const testOutputPath = path.join(temporaryDirectory(instanceId, true), 'results.png');
  console.log(testOutputPath)

  beforeEach(() => {
    // Delete target if a legacy run artifact remains on disk
    if (fs.existsSync(testOutputPath)) {
      fs.unlinkSync(testOutputPath);
    }
  });

  afterEach(() => {
    // Clean up file asset afterward if you want tests to stay decoupled
    if (fs.existsSync(testOutputPath)) {
      //fs.unlinkSync(testOutputPath);
    }
  });

  it('should run headless chromium and generate a physical file containing binary content', async () => {
    const jsonPath = path.join(__dirname, '../../mock_data/mockLeaderboard.json');

    // Read and parse the file natively on the test thread
    const rawJsonData = fs.readFileSync(jsonPath, 'utf8');
    const dynamicLeaderboardPayload = JSON.parse(rawJsonData);

    // Execute live engine step
    await generateResultsImage(instanceId, dynamicLeaderboardPayload, mockUserData);

    // Verify file asset existence on disk boundary
    expect(fs.existsSync(testOutputPath)).toBe(true);

    // Verify file is a non-empty image sequence payload
    const stats = fs.statSync(testOutputPath);
    expect(stats.size).toBeGreaterThan(1000); // Confirms it isn't an empty or blank file asset
  });
});