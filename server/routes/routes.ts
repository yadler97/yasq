import express from 'express';
import { GameInstance, Track } from '../models.js';
import type { InstanceQuery, InstanceUserQuery } from '../types.js';
import { GameState, Joker } from '../constants.js';

export const setupRoutes = (instances: Record<string, GameInstance>, isMockMode: boolean, allTracks: any) => {
  const router = express.Router();

  router.post("/token", async (req, res) => {
    const { code } = req.body;

    if (isMockMode && code === 'mock_code') {
      return res.send({ access_token: 'mock_token_for_dev' });
    }

    // 1. Validate that we actually have the required data
    if (!code) {
      return res.status(400).send({ error: "Missing code" });
    }

    // 2. Cast or provide fallbacks for process.env
    const params = new URLSearchParams({
      client_id: process.env.VITE_DISCORD_CLIENT_ID || '',
      client_secret: process.env.DISCORD_CLIENT_SECRET || '',
      grant_type: "authorization_code",
      code: String(code),
    });

    // 3. Exchange the code for an access_token
    const response = await fetch(`https://discord.com/api/oauth2/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    });

    // 4. Return the access_token to our client as { access_token: "..."}
    const data = (await response.json()) as { access_token: string };

    res.send({ access_token: data.access_token });
  });

  router.post("/log", (req, res) => {
    const { message, user } = req.body;
    console.log(`[CLIENT LOG] User ${user}: ${message}`);
    res.sendStatus(200);
  });

  router.post("/register", (req, res) => {
    const { instanceId, userId, username } = req.body;

    if (!instanceId || !userId) {
      return res.status(400).send({ error: "Missing data" });
    }

    // If no one has registered for this instance yet, this user is the host
    if (!instances[instanceId]) {
      instances[instanceId] = new GameInstance(userId);
      console.log(`[HOST ASSIGNED] ${username} is the host of new instance ${instanceId}`);
    }

    const game = instances[instanceId];
    game.registeredUsers.add(userId);

    res.send({ 
      isHost: game.isHost(userId),
      hostId: game.hostId
    });
  });

  router.post("/ready", (req, res) => {
    const { instanceId, userId, ready } = req.body;

    const game = instances[instanceId];

    if (!game) {
      return res.status(400).send({ error: "Instance not found" });
    }

    if (ready) {
      game.readyUsers.add(userId);
    } else {
      game.readyUsers.delete(userId);
    }

    res.send({ 
      readyUsers: [...game.readyUsers]
    });
  });

  router.get("/ready-status", (req, res) => {
    const { instanceId } = req.query as InstanceQuery;
    const game = instances[instanceId];

    if (!game) {
      return res.status(400).send({ error: "Instance not found" });
    }

    res.send({ 
      readyUsers: [...game.readyUsers]
    });
  });

  router.post("/assign-host", (req, res) => {
    const { instanceId, userId, newHostId } = req.body;
    const game = instances[instanceId];

    // Security: Check if the requester is the actual current host
    if (!game?.isHost(userId)) {
      return res.status(403).send({ error: "Unauthorized" });
    }

    if (!game.registeredUsers.has(newHostId)) {
      return res.status(400).send({ error: "New host must be a registered user" });
    }

    game.hostId = newHostId;
    game.readyUsers.delete(newHostId); // New host not required to be ready
    console.log(`[HOST ASSIGNED] Host changed to ${newHostId} in instance ${instanceId}`);
    res.send({ status: "success" });
  });

  router.post("/setup-game", (req, res) => {
    const { instanceId, userId, rounds, trackDuration } = req.body;
    const game = instances[instanceId];

    // Security check: only host can setup a game
    if (!game?.isHost(userId)) {
      return res.status(403).send({ error: "Only host can setup a game" });
    }

    if (rounds <= 0 || trackDuration <= 0) {
      return res.status(400).send({ error: "Rounds and track duration must be greater than 0." });
    }

    game.setupGame(rounds, trackDuration);
    console.log(`[GAME] Instance ${instanceId} has been set up with settings: rounds: ${game.settings.rounds}, trackDuration: ${game.settings.trackDuration}!`);
    res.send({ status: GameState.LOBBY });
  });

  router.post("/start-game", (req, res) => {
    const { instanceId, userId } = req.body;
    const game = instances[instanceId];

    // Security check: only host can start a game
    if (!game?.isHost(userId)) {
      return res.status(403).send({ error: "Only host can start a game" });
    }

    game.startGame();
    console.log(`[GAME] Instance ${instanceId} has started!`);
    res.send({ status: GameState.TRACK_SELECTION });
  });

  router.get("/game-status", (req, res) => {
    const { instanceId } = req.query as InstanceQuery;
    const game = instances[instanceId];

    if (!game) {
      return res.status(400).send({ error: "Instance not found" });
    }

    res.send({
      state: game.state,
      hostId: game.hostId,
      readyUsers: [...game.readyUsers],
      currentRound: game.currentRound,
      isFinalRound: game.isFinalRound(),
      currentGame: game.currentGame,
      lastWinnerId: game.lastWinnerId,
      rounds: game.settings.rounds,
      trackDuration: game.settings.trackDuration
    });
  });

  router.get("/track-list", (req, res) => {
    const { instanceId, userId } = req.query as InstanceUserQuery;
    const game = instances[instanceId];

    if (!game?.isHost(userId)) {
      return res.status(403).send({ error: "Only the host can get track list." });
    }

    if (allTracks.length === game.trackHistory.length) {
      game.trackHistory = []; // Reset history if all tracks have been played
    }

    const trackList = allTracks.map((t: { name: string; title: string, file: string }, index: number) => ({
      id: index,
      name: t.name,
      title: t.title,
      file: t.file,
      played: game.trackHistory.includes(t.file)
    }));
    res.json(trackList);
  });

  router.post("/guess", (req, res) => {
    const { instanceId, userId, guess } = req.body;
    const game = instances[instanceId];

    if (!game) {
      return res.status(400).send({ error: "Instance not found" });
    }

    if (!game.registeredUsers.has(userId)) {
      return res.status(403).send({ error: "User not registered in this instance." });
    }

    const { current, total } = game.submitGuess(userId, guess);
    console.log(`[GUESS] ${current}/${total} players have guessed.`);

    if (game.state === GameState.ROUND_COMPLETED) {
      console.log(`[STATE] Instance ${instanceId} moved to ROUND_COMPLETED`);
    }

    res.send({ status: "submitted" });
  });

  router.get("/get-guesses", (req, res) => {
    const { instanceId, userId } = req.query as InstanceUserQuery;
    const game = instances[instanceId];

    // Security: Only the host should be able to pull the summary early
    if (!game?.isHost(userId)) {
      return res.status(403).send({ error: "Unauthorized" });
    }

    const timedOutPlayers = game.getTimedOutPlayers();
    if (timedOutPlayers.length > 0) {
      console.log(`[TIMED OUT] The following players have not submitted a guess: ${timedOutPlayers}`);
    }

    res.send({
      round: game.currentRound,
      answer: game.trackInfo?.track.name,
      guesses: game.guesses[game.currentRound] || {},
      timedOut: timedOutPlayers
    });
  });

  router.post("/submit-round-results", (req, res) => {
    const { instanceId, userId, corrections } = req.body;
    const game = instances[instanceId];

    // Security: Only host can submit final results
    if (!game?.isHost(userId)) {
      return res.status(403).send({ error: "Only host can submit results." });
    }

    console.log(`[RESULTS] Host submitted corrections for instance ${instanceId}:`, corrections);
    game.submitResults(corrections);

    console.log(`[RESULTS] Results calculated for instance ${instanceId}: ${JSON.stringify(game.leaderboard.getRoundResults(game.currentRound))}.`);
    res.send({ status: "success" });
  });

  router.get("/get-results", (req, res) => {
    const { instanceId, userId } = req.query as InstanceUserQuery;
    const game = instances[instanceId];

    if (game?.state !== GameState.RESULTS) {
      return res.status(400).send({ error: "Results not ready yet" });
    }

    const entry = game.leaderboard.getEntry(userId);
    if (!entry) {
      return res.status(403).send({ error: "User not found in leaderboard." });
    }

    // Get the most recent round result from the user's round history
    const roundResult = entry.roundHistory.find(r => r.round === game.currentRound);

    res.send({
      round: game.currentRound,
      result: roundResult,
      correctAnswer: game.trackInfo?.track.name,
      trackTitle: game.trackInfo?.track.title,
      gameCover: game.trackInfo?.gameCoverUrl
    });
  });

  router.post("/start-next-round", (req, res) => {
    const { instanceId, userId } = req.body;
    const game = instances[instanceId];

    // Security check: only host can start
    if (!game?.isHost(userId)) {
      return res.status(403).send({ error: "Only host can start" });
    }

    const newState = game.advanceRound();

    if (newState === GameState.GAME_FINISHED) {
      console.log(`[GAME] Instance ${instanceId} has ended!`);
      console.log(`[FINAL RESULTS] Instance ${instanceId} final leaderboard:`, JSON.stringify(game.leaderboard.getAll()));
    }

    if (newState === GameState.TRACK_SELECTION) {
      console.log(`[GAME] Instance ${instanceId} has advanced to next round!`);
    }

    res.send({ status: newState });
  });

  router.post("/play-local", (req, res) => {
    const { fileName, instanceId, userId } = req.body;
    const game = instances[instanceId];

    // Security check: Only the host of this specific instance can change the music
    if (!game?.isHost(userId)) {
      return res.status(403).send({ error: "Only the host can change tracks." });
    }

    const track = allTracks.find((t: Track) => t.file === fileName);

    if (!track) {
      return res.status(400).send({ error: "Track not found." });
    }

    game.playTrack(track);

    console.log(`[MUSIC] Instance ${instanceId} started playing ${fileName}`);
    res.send({
      status: "playing",
      track: game.trackInfo
    });
  });

  router.get("/current-track", (req, res) => {
    const { instanceId } = req.query as InstanceQuery;
    const game = instances[instanceId];

    if (game?.state === GameState.PLAYING) {
      const track = game.trackInfo;
      return res.send({
        url: track?.url,
        startTime: track?.startTime,
        endTime: track?.endTime
      });
    }

    res.send({ url: null, startTime: 0, endTime: 0 });
  });

  router.get("/get-final-results", (req, res) => {
    const { instanceId } = req.query as InstanceQuery;
    const game = instances[instanceId];

    if (game?.state !== GameState.GAME_FINISHED) {
      return res.status(400).send({ error: "Game has not finished yet." });
    }

    res.send({ leaderboard: game.leaderboard.getAll() || [] });
  });

  router.post("/restart-game", (req, res) => {
    const { instanceId, userId } = req.body;
    const game = instances[instanceId];

    if (!game?.isHost(userId)) {
      return res.status(403).json({ error: "Only the host can restart the game." });
    }

    game.restart();

    res.send({ success: true });
  });

  router.get("/get-available-jokers", (req, res) => {
    const { instanceId, userId } = req.query as InstanceUserQuery;
    const game = instances[instanceId];

    if (!game) {
      return res.status(404).send({ error: "Instance not found" });
    }

    // Get all possible jokers
    const allJokers = Object.values(Joker) as Joker[];

    // Filter out the ones the user has already used
    const available = allJokers.filter(joker => game.canUseJoker(userId, joker));

    res.send({ 
      available,
      used: Array.from(game.usedJokers[userId] || []) 
    });
  });

  router.post("/use-joker", (req, res) => {
    const { instanceId, userId, jokerType } = req.body;
    const game = instances[instanceId];

    if (!game) {
      return res.status(400).send({ error: "Instance not found" });
    }

    if (!game.canUseJoker(userId, jokerType)) {
      return res.status(403).send({ error: "Joker already used" });
    }

    let hint: any;
    switch (jokerType) {
      case Joker.OBFUSCATION:
        hint = game.getPartialHint();
        break;
      case Joker.TAGS:
        hint = game.getTagHint();
        break;
      case Joker.MULTIPLE_CHOICE:
        hint = game.getMultipleChoiceHint(allTracks);
        break;
      default:
        return res.status(400).send({ error: "Invalid joker type" });
    }

    game.markJokerUsed(userId, jokerType);

    res.send({ 
      jokerType, 
      hint 
    });
  });

  return router;
};