import express from 'express';
import { GameInstance, Leaderboard } from '../src/models.js';
import type { Server } from 'socket.io';
import { broadcastGameStatus } from '../src/helper.js';
import { logger } from '../src/utils/logger.js';

export const setupMockRoutes = (server: Server, instances: Record<string, GameInstance>) => {
  const router = express.Router();

  const triggerUpdate = (instanceId: string): void => {
    const game = instances[instanceId];
    if (game) {
      broadcastGameStatus(server, instanceId, game);
    }
  };

  router.post('/setup-session', (req, res) => {
    const { instanceId } = req.body;

    if (!instanceId) {
      return res.status(400).send({ error: 'instanceId is required' });
    }

    const game = setMockState(req.body);

    instances[instanceId] = game;

    triggerUpdate(instanceId);

    res.status(200).send({ message: 'Mock data loaded', instance: instances[instanceId] });
  });

  router.patch('/instance/:instanceId', (req, res) => {
    const { instanceId } = req.params;
    const game = instances[instanceId];

    if (!game) {
      return res.status(400).send({ error: 'Instance not found' });
    }

    const updates = req.body;

    if (updates.state !== undefined) game.state = updates.state;
    if (updates.currentRound !== undefined) game.currentRound = updates.currentRound;
    if (updates.hostId !== undefined) game.hostId = updates.hostId;
    if (updates.currentGame !== undefined) game.currentGame = updates.currentGame;
    if (updates.lastWinnerId !== undefined) game.lastWinnerId = updates.lastWinnerId;
    if (updates.registeredUsers) {
      game.registeredUsers = new Set(updates.registeredUsers.map((u: any) => (typeof u === 'string' ? u : u.id)));
    }
    if (updates.readyUsers) {
      game.readyUsers = new Set(updates.readyUsers);
    }
    if (updates.trackHistory) {
      game.trackHistory = updates.trackHistory;
    }
    if (updates.settings) {
      game.settings = {
        ...game.settings,
        ...updates.settings,
        enabledJokers: new Set(updates.settings.enabledJokers ?? []),
      };
    }
    if (updates.trackInfo) {
      game.trackInfo = {
        url: updates.trackInfo.url,
        startTime: updates.trackInfo.startTime,
        endTime: updates.trackInfo.endTime,
        track: updates.trackInfo.track,
        gameCoverUrl: updates.trackInfo.gameCoverUrl,
      };
    }
    if (updates.guesses) {
      game.guesses = updates.guesses;
    }
    if (updates.leaderboard) {
      game.leaderboard = Leaderboard.fromJSON(updates.leaderboard);
    }
    if (updates.usedJokers) {
      game.usedJokers = updates.usedJokers;
    }
    if (updates.streaks) {
      game.streaks = updates.streaks;
    }
    if (updates.currentRoundLostStreaks) {
      game.currentRoundLostStreaks = updates.currentRoundLostStreaks;
    }

    triggerUpdate(instanceId);

    res.status(200).send({ message: 'Instance updated', instance: game });
  });

  router.delete('/instance/:instanceId', (req, res) => {
    const { instanceId } = req.params;

    if (instances[instanceId]) {
      delete instances[instanceId];
      logger.debug(instanceId, `Successfully deleted test instance`);
      return res.status(200).send({ message: `Instance ${instanceId} deleted` });
    }

    triggerUpdate(instanceId);

    res.status(204).send();
  });

  return router;
};

export function setMockState(stateData: any): GameInstance {
  const instanceId = stateData.instanceId || 'test-instance';
  const hostId = stateData.hostId || stateData.registeredUsers?.[0]?.id;

  const game = new GameInstance(instanceId, hostId);

  // Assign standard properties
  Object.assign(game, stateData);

  // Assign complex fields and Sets
  if (stateData.registeredUsers) {
    const registeredUserIds = stateData.registeredUsers.map((u: any) => (typeof u === 'string' ? u : u.id));
    game.registeredUsers = new Set(registeredUserIds);
  }

  if (stateData.readyUserIds) {
    game.readyUsers = new Set(stateData.readyUserIds);
  }

  if (stateData.settings?.enabledJokers) {
    game.settings = {
      ...game.settings,
      enabledJokers: new Set(stateData.settings.enabledJokers),
    };
  }

  if (stateData.leaderboard) {
    game.leaderboard = Leaderboard.fromJSON(stateData.leaderboard);
  }

  return game;
}
