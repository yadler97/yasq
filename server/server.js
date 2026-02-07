import express from "express";
import dotenv from "dotenv";
import fetch from "node-fetch";
import path from "path";
import fs from 'fs';
import { fileURLToPath } from 'url';
dotenv.config({ path: "../.env" });

const app = express();
const port = 3001;

const instanceHosts = {};
const instanceTracks = {};
const instanceReadyStates = {};
const instanceStates = {};
const instanceGuesses = {};
const instanceRounds = {};

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const tracksRaw = fs.readFileSync(path.join(__dirname, 'tracks.json'), 'utf-8');
const allTracks = JSON.parse(tracksRaw);

// Allow express to parse JSON bodies
app.use(express.json());
app.use('/music', express.static(path.join(__dirname, 'music')));

app.post("/api/token", async (req, res) => {
  
  // Exchange the code for an access_token
  const response = await fetch(`https://discord.com/api/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: process.env.VITE_DISCORD_CLIENT_ID,
      client_secret: process.env.DISCORD_CLIENT_SECRET,
      grant_type: "authorization_code",
      code: req.body.code,
    }),
  });

  // Retrieve the access_token from the response
  const { access_token } = await response.json();

  // Return the access_token to our client as { access_token: "..."}
  res.send({access_token});
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
  if (!instanceHosts[instanceId]) {
    instanceHosts[instanceId] = userId;
    console.log(`[HOST ASSIGNED] ${username} is the host of instance ${instanceId}`);
  }

  res.send({ 
    isHost: instanceHosts[instanceId] === userId,
    hostId: instanceHosts[instanceId] 
  });
});

app.post("/api/ready", (req, res) => {
  const { instanceId, userId, ready } = req.body;
  
  if (!instanceReadyStates[instanceId]) {
    instanceReadyStates[instanceId] = {};
  }
  
  if (ready) {
    instanceReadyStates[instanceId][userId] = true;
  } else {
    delete instanceReadyStates[instanceId][userId];
  }
  
  res.send({ 
    readyUsers: Object.keys(instanceReadyStates[instanceId]) 
  });
});

app.get("/api/ready-status", (req, res) => {
  const { instanceId } = req.query;
  const readyUsers = instanceReadyStates[instanceId] ? Object.keys(instanceReadyStates[instanceId]) : [];
  res.send({ readyUsers });
});

app.post("/api/start-game", (req, res) => {
  const { instanceId, userId } = req.body;

  // Security check: only host can start
  if (instanceHosts[instanceId] !== userId) {
    return res.status(403).send({ error: "Only host can start" });
  }

  instanceStates[instanceId] = 'PLAYING';
  instanceRounds[instanceId] = 1;
  console.log(`[GAME] Instance ${instanceId} has started!`);
  res.send({ status: 'PLAYING' });
});

app.get("/api/game-status", (req, res) => {
  const { instanceId } = req.query;
  res.send({
    state: instanceStates[instanceId] || 'LOBBY',
    readyUsers: Object.keys(instanceReadyStates[instanceId] || {}),
    currentRound: instanceRounds[instanceId] || 1
  });
});

app.get("/api/track-list", (req, res) => {
  const { instanceId, userId } = req.query;

  if (instanceHosts[instanceId] !== userId) {
    return res.status(403).send({ error: "Only the host can get track list." });
  }

  const trackList = allTracks.map((t, index) => ({
    id: index,
    name: t.name,
    file: t.file
  }));
  res.json(trackList);
});

app.post("/api/guess", (req, res) => {
  const { instanceId, userId, guess } = req.body;

  const currentRound = instanceRounds[instanceId];

  if (!instanceGuesses[instanceId]) instanceGuesses[instanceId] = {};
  if (!instanceGuesses[instanceId][currentRound]) instanceGuesses[instanceId][currentRound] = {};

  instanceGuesses[instanceId][currentRound][userId] = {
    text: guess,
    isCorrect: false
  };

  const readyUsers = Object.keys(instanceReadyStates[instanceId] || {});
  const guessers = Object.keys(instanceGuesses[instanceId]);

  console.log(`[GUESS] ${guessers.length}/${readyUsers.length} players have guessed.`);

  if (guessers.length >= readyUsers.length) {
    instanceStates[instanceId] = 'ROUND_COMPLETED';
    console.log(`[STATE] Instance ${instanceId} moved to ROUND_COMPLETED`);
  }

  res.send({ status: "submitted" });
});

app.get("/api/get-guesses", (req, res) => {
  const { instanceId, userId } = req.query;

  // Security: Only the host should be able to pull the summary early
  if (instanceHosts[instanceId] !== userId) {
    return res.status(403).send({ error: "Unauthorized" });
  }

  const round = instanceRounds[instanceId];
  const roundData = instanceTracks[instanceId];
  const guesses = instanceGuesses[instanceId]?.[round] || {};

  res.send({
    round: round,
    answer: roundData.answer,
    guesses: guesses,
  });
});

app.post("/api/submit-round-results", (req, res) => {
  const { instanceId, userId, corrections } = req.body;

  // Security: Only host can submit final results
  if (instanceHosts[instanceId] !== userId) {
    return res.status(403).send({ error: "Only host can submit results." });
  }

  const currentRound = instanceRounds[instanceId];

  if (instanceGuesses[instanceId] && instanceGuesses[instanceId][currentRound]) {
    Object.entries(corrections).forEach(([userId, isCorrect]) => {
      if (instanceGuesses[instanceId][currentRound][userId]) {
        instanceGuesses[instanceId][currentRound][userId].isCorrect = isCorrect;
      }
    });
  }

  instanceStates[instanceId] = 'RESULTS';
  instanceReadyStates[instanceId] = {}; // Reset ready states for next round

  console.log(`[RESULTS] Host submitted corrections for instance ${instanceId}:`, corrections);
  res.send({ status: "success" });
});

app.get("/api/get-results", (req, res) => {
  const { instanceId, userId } = req.query;

  const state = instanceStates[instanceId];
  if (state !== "RESULTS") {
    return res.status(400).send({ error: "Results not ready yet" });
  }

  const round = instanceRounds[instanceId];
  const roundGuesses = instanceGuesses[instanceId]?.[round] || {};
  const userGuess = roundGuesses[userId];

  res.send({
    round: round,
    guess: userGuess
  });
});

app.post("/api/start-next-round", (req, res) => {
  const { instanceId, userId } = req.body;

  // Security check: only host can start
  if (instanceHosts[instanceId] !== userId) {
    return res.status(403).send({ error: "Only host can start" });
  }

  instanceRounds[instanceId] = instanceRounds[instanceId] + 1;
  instanceStates[instanceId] = 'PLAYING';
  console.log(`[GAME] Instance ${instanceId} has started!`);
  res.send({ status: 'PLAYING' });
});

app.post("/api/play-local", (req, res) => {
  const { fileName, instanceId, userId } = req.body;

  // Security check: Only the host of this specific instance can change the music
  if (instanceHosts[instanceId] !== userId) {
    return res.status(403).send({ error: "Only the host can change tracks." });
  }

  const trackInfo = allTracks.find(t => t.file === fileName);
  
  // Save track data specifically for this instance
  instanceTracks[instanceId] = {
    url: `/music/${fileName}`,
    startTime: Date.now(),
    answer: trackInfo ? trackInfo.name : null
  };
  
  console.log(`[MUSIC] Instance ${instanceId} started playing ${fileName}`);
  res.send({ status: "playing", track: instanceTracks[instanceId] });
});

app.get("/api/current-track", (req, res) => {
  const { instanceId } = req.query;

  const currentState = instanceStates[instanceId];

  if (currentState === "PLAYING") {
    const track = instanceTracks[instanceId] || { url: null, startTime: 0 };
    return res.send(track);
  }

  res.send({ url: null, startTime: 0 });
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
