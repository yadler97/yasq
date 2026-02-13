import express from "express";
import dotenv from "dotenv";
import fetch from "node-fetch";
import path from "path";
import fs from 'fs';
import { fileURLToPath } from 'url';

import { GameState } from './constants.js';
import { GameInstance } from './models.js';

import type {
  InstanceQuery,
  InstanceUserQuery
} from "./types.js";

dotenv.config({ path: "../.env" });

const app = express();
const port = 3001;

const instances: Record<string, GameInstance> = {};

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const tracksRaw = fs.readFileSync(path.join(__dirname, 'tracks.json'), 'utf-8');
const allTracks = JSON.parse(tracksRaw);

// Allow express to parse JSON bodies
app.use(express.json());
app.use('/music', express.static(path.join(__dirname, 'music')));

app.post("/api/token", async (req, res) => {
  const { code } = req.body;

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

app.post("/api/log", (req, res) => {
  const { message, user } = req.body;
  console.log(`[CLIENT LOG] User ${user}: ${message}`);
  res.sendStatus(200);
});

app.post("/api/register", (req, res) => {
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

  res.send({ 
    isHost: game.isHost(userId),
    hostId: game.hostId
  });
});

app.post("/api/ready", (req, res) => {
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

app.get("/api/ready-status", (req, res) => {
  const { instanceId } = req.query as InstanceQuery;
  const game = instances[instanceId];

  if (!game) {
    return res.status(400).send({ error: "Instance not found" });
  }

  res.send({ 
    readyUsers: [...game.readyUsers]
  });
});

app.post("/api/assign-host", (req, res) => {
  const { instanceId, userId, newHostId } = req.body;
  const game = instances[instanceId];

  // Security: Check if the requester is the actual current host
  if (!game?.isHost(userId)) {
    return res.status(403).send({ error: "Unauthorized" });
  }

  game.hostId = newHostId;
  console.log(`[HOST ASSIGNED] Host changed to ${newHostId} in instance ${instanceId}`);
  res.send({ status: "success" });
});

app.post("/api/start-game", (req, res) => {
  const { instanceId, userId, rounds, trackDuration } = req.body;
  const game = instances[instanceId];

  // Security check: only host can start
  if (!game?.isHost(userId)) {
    return res.status(403).send({ error: "Only host can start" });
  }

  game.startGame(rounds, trackDuration);
  console.log(`[GAME] Instance ${instanceId} has started with settings: rounds: ${game.settings.rounds}, trackDuration: ${game.settings.trackDuration}!`);
  res.send({ status: GameState.TRACK_SELECTION });
});

app.get("/api/game-status", (req, res) => {
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
    currentGame: game.currentGame
  });
});

app.get("/api/track-list", (req, res) => {
  const { instanceId, userId } = req.query as InstanceUserQuery;
  const game = instances[instanceId];

  if (!game?.isHost(userId)) {
    return res.status(403).send({ error: "Only the host can get track list." });
  }

  const trackList = allTracks.map((t: { name: string; file: string }, index: number) => ({
    id: index,
    name: t.name,
    file: t.file
  }));
  res.json(trackList);
});

app.post("/api/guess", (req, res) => {
  const { instanceId, userId, guess } = req.body;
  const game = instances[instanceId];

  if (!game) {
    return res.status(400).send({ error: "Instance not found" });
  }

  const { current, total } = game.submitGuess(userId, guess);
  console.log(`[GUESS] ${current}/${total} players have guessed.`);

  if (game.state === GameState.ROUND_COMPLETED) {
    console.log(`[STATE] Instance ${instanceId} moved to ROUND_COMPLETED`);
  }

  res.send({ status: "submitted" });
});

app.get("/api/get-guesses", (req, res) => {
  const { instanceId, userId } = req.query as InstanceUserQuery;
  const game = instances[instanceId];

  // Security: Only the host should be able to pull the summary early
  if (!game?.isHost(userId)) {
    return res.status(403).send({ error: "Unauthorized" });
  }

  res.send({
    round: game.currentRound,
    answer: game.trackInfo.answer,
    guesses: game.guesses[game.currentRound] || {},
  });
});

app.post("/api/submit-round-results", (req, res) => {
  const { instanceId, userId, corrections } = req.body;
  const game = instances[instanceId];

  // Security: Only host can submit final results
  if (!game?.isHost(userId)) {
    return res.status(403).send({ error: "Only host can submit results." });
  }

  game.submitResults(corrections);

  console.log(`[RESULTS] Host submitted corrections for instance ${instanceId}:`, corrections);
  res.send({ status: "success" });
});

app.get("/api/get-results", (req, res) => {
  const { instanceId, userId } = req.query as InstanceUserQuery;
  const game = instances[instanceId];

  if (game?.state !== GameState.RESULTS) {
    return res.status(400).send({ error: "Results not ready yet" });
  }

  const roundGuesses = game.guesses[game.currentRound] || {};
  const userGuess = roundGuesses[userId];

  res.send({
    round: game.currentRound,
    guess: userGuess,
    correctAnswer: game.trackInfo.answer
  });
});

app.post("/api/start-next-round", (req, res) => {
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

app.post("/api/play-local", (req, res) => {
  const { fileName, instanceId, userId } = req.body;
  const game = instances[instanceId];

  // Security check: Only the host of this specific instance can change the music
  if (!game?.isHost(userId)) {
    return res.status(403).send({ error: "Only the host can change tracks." });
  }

  const track = allTracks.find((t: { name: string; file: string }) => t.file === fileName);
  const trackName = track ? track.name : null;

  game.playTrack(fileName, trackName);

  console.log(`[MUSIC] Instance ${instanceId} started playing ${fileName}`);
  res.send({
    status: "playing",
    track: game.trackInfo
  });
});

app.get("/api/current-track", (req, res) => {
  const { instanceId } = req.query as InstanceQuery;
  const game = instances[instanceId];

  if (game?.state === GameState.PLAYING) {
    const track = game.trackInfo;
    return res.send({
      url: track.url,
      startTime: track.startTime,
      endTime: track.endTime
    });
  }

  res.send({ url: null, startTime: 0, endTime: 0 });
});

app.get("/api/get-final-results", (req, res) => {
  const { instanceId } = req.query as InstanceQuery;
  const game = instances[instanceId];

  if (game?.state !== GameState.GAME_FINISHED) {
    return res.status(400).send({ error: "Game has not finished yet." });
  }

  res.send({ leaderboard: game.leaderboard.getAll() || [] });
});

app.post('/api/restart-game', (req, res) => {
  const { instanceId, userId } = req.body;
  const game = instances[instanceId];

  if (!game?.isHost(userId)) {
    return res.status(403).json({ error: "Only the host can restart the game." });
  }

  const currentGame = game.currentGame;

  // Reset all game-related data for this instance
  const newGame = new GameInstance(game.hostId);
  newGame.currentGame = currentGame + 1; // Increment game number to differentiate between sessions

  instances[instanceId] = newGame

  res.send({ success: true });
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
