import express from 'express';
import { GameInstance, Leaderboard, Settings, TrackInfo } from '../models.js';

export const setupMockRoutes = (instances: Record<string, GameInstance>) => {
  const router = express.Router();

  router.post("/setup-session", (req, res) => {
    const {
      instanceId,
      registeredUsers = [],
      hostId = registeredUsers[0]?.id, // Default host is the first player in the list
      state = 'LOBBY',
      currentRound = 1,
      readyUserIds = [],
      settings = new Settings(5, 30),
      trackInfo = null,
      guesses = {},
      leaderboard = new Leaderboard(),
      currentGame = 1,
      trackHistory = [],
      lastWinnerId
    } = req.body;

    if (!instanceId) {
      return res.status(400).send({ error: "instanceId is required" });
    }

    // Set the mock state
    const game = new GameInstance(hostId);
    const registeredUserIds = registeredUsers.map((u: { id: string; }) => u.id);
    game.registeredUsers = new Set(registeredUserIds);
    game.state = state;
    game.currentRound = currentRound;
    game.readyUsers = new Set(readyUserIds);
    game.settings = settings;
    game.trackInfo = trackInfo;
    game.guesses = guesses;
    game.leaderboard = Leaderboard.fromJSON(leaderboard);
    game.currentGame = currentGame;
    game.trackHistory = trackHistory;
    game.lastWinnerId = lastWinnerId;

    instances[instanceId] = game;

    res.status(200).send({ message: "Mock data loaded", instance: instances[instanceId] });
  });

  router.patch("/instance/:instanceId", (req, res) => {
    const { instanceId } = req.params;
    const game = instances[instanceId];

    if (!game) {
      return res.status(400).send({ error: "Instance not found" });
    }

    const updates = req.body;

    if (updates.state !== undefined) game.state = updates.state;
    if (updates.currentRound !== undefined) game.currentRound = updates.currentRound;
    if (updates.hostId !== undefined) game.hostId = updates.hostId;
    if (updates.currentGame !== undefined) game.currentGame = updates.currentGame;
    if (updates.lastWinnerId !== undefined) game.lastWinnerId = updates.lastWinnerId;
    if (updates.registeredUsers) {
      game.registeredUsers = new Set(updates.registeredUsers.map((u: any) => typeof u === 'string' ? u : u.id));
    }
    if (updates.readyUsers) {
      game.readyUsers = new Set(updates.readyUsers);
    }
    if (updates.trackHistory) {
      game.trackHistory = updates.trackHistory;
    }
    if (updates.settings) {
      game.settings = new Settings(updates.settings.rounds, updates.settings.trackDuration);
    }
    if (updates.trackInfo) {
      game.trackInfo = new TrackInfo(
        updates.trackInfo.url,
        updates.trackInfo.startTime,
        updates.trackInfo.endTime,
        updates.trackInfo.track,
        updates.trackInfo.gameCoverUrl
      );
    }
    if (updates.guesses) {
      game.guesses = updates.guesses;
    }
    if (updates.leaderboard) {
      game.leaderboard = Leaderboard.fromJSON(updates.leaderboard);
    }

    res.status(200).send({ message: "Instance updated", instance: game });
  });

  router.delete("/instance/:instanceId", (req, res) => {
    const { instanceId } = req.params;

    if (instances[instanceId]) {
      delete instances[instanceId];
      console.log(`Successfully purged test instance: ${instanceId}`);
      return res.status(200).send({ message: `Instance ${instanceId} deleted` });
    }

    res.status(204).send();
  });

  return router;
};