import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { setBaseUrl, setupGame } from '../../client/src/utils/backend';
import { setupServer } from '../../server';
import { FirstBonusMultiplier, StreakBonusMultiplier, TimeBonus } from '@yasq/shared';
import type { Server } from 'http';
import { AddressInfo } from 'net';
import { TestApi } from './api';

let httpServer: Server;
let baseUrl: string;
let currentInstanceId: string;
let api: TestApi;

beforeAll(async () => {
  process.env.VITE_MOCK_MODE = 'true';
  httpServer = setupServer();

  await new Promise<void>((resolve) => {
    httpServer.listen(0, () => {
      // Get the port assigned by the OS
      const address = httpServer.address() as AddressInfo;
      const port = address.port;

      baseUrl = `http://localhost:${port}`;
      setBaseUrl(baseUrl);
      resolve();
    });
  });
});

afterAll(async () => {
  if (httpServer) {
    await new Promise<void>((resolve) => httpServer.close(() => resolve()));
  }
});

beforeEach(async (context) => {
  currentInstanceId = `test-instance-${context.task.id}`;
  api = new TestApi(baseUrl, currentInstanceId);
});

describe('setupGame', () => {

  beforeEach(async () => {
    await api.setupSession([{ id: '1' }], 'SETUP');
  });

  it('should return 200 OK when valid settings are provided', async () => {
    const token = 'token_1';

    const setupRes = await setupGame(token, currentInstanceId,
      {
        rounds: 5,
        trackDuration: 60,
        enabledJokers: [],
        firstBonusMultiplier: FirstBonusMultiplier.OFF,
        timeBonus: TimeBonus.LINEAR,
        streakBonusMultiplier: StreakBonusMultiplier.OFF
      }
    );
    const body = await setupRes.json();

    expect(setupRes.status).toBe(200);
    expect(body.status).toContain('LOBBY');
  });

  it('should return a 400 Bad Request error when rounds are set to 0', async () => {
    const token = 'token_1';

    const setupRes = await setupGame(token, currentInstanceId,
      {
        rounds: 0,
        trackDuration: 60,
        enabledJokers: [],
        firstBonusMultiplier: FirstBonusMultiplier.OFF,
        timeBonus: TimeBonus.LINEAR,
        streakBonusMultiplier: StreakBonusMultiplier.OFF
      }
    );
    const body = await setupRes.json();

    expect(setupRes.status).toBe(400);
    expect(body.error).toContain('Rounds and track duration must be greater than 0.');
  });

  it('should return a 400 Bad Request error when track duration exceeds the maximum allowed value', async () => {
    const token = 'token_1';

    const setupRes = await setupGame(token, currentInstanceId,
      {
        rounds: 5,
        trackDuration: 999999999,
        enabledJokers: [],
        firstBonusMultiplier: FirstBonusMultiplier.OFF,
        timeBonus: TimeBonus.LINEAR,
        streakBonusMultiplier: StreakBonusMultiplier.OFF
      }
    );
    const body = await setupRes.json();

    expect(setupRes.status).toBe(400);
    expect(body.error).toContain('Track duration must not exceed');
  });
});