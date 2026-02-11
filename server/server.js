import express from "express";
import dotenv from "dotenv";
import fetch from "node-fetch";
import path from "path";
import fs from 'fs';
import { fileURLToPath } from 'url';
import { GameState } from './constants.js';

dotenv.config({ path: "../.env" });

const app = express();
const port = 3001;

const instanceHosts = {};
const instanceTracks = {};
const instanceReadyStates = {};
const instanceStates = {};
const instanceGuesses = {};
const instanceRounds = {};
const instanceSettings = {};
const instanceFinalResults = {};

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const tracksRaw = fs.readFileSync(path.join(__dirname, 'tracks.json'), 'utf-8');
const allTracks = JSON.parse(tracksRaw);

const DEFAULT_TRACK_DURATION = 30000;
const DEFAULT_ROUNDS = 5;
const BASE_POINTS = 100;
const FIRST_BONUS_MULTIPLIER = 1.2;

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
  const { instanceId, userId, rounds, trackDuration } = req.body;

  // Security check: only host can start
  if (instanceHosts[instanceId] !== userId) {
    return res.status(403).send({ error: "Only host can start" });
  }

  instanceSettings[instanceId] = {
    rounds: rounds || DEFAULT_ROUNDS,
    trackDuration: trackDuration * 1000 || DEFAULT_TRACK_DURATION
  };
  instanceStates[instanceId] = GameState.TRACK_SELECTION;
  instanceRounds[instanceId] = 1;
  console.log(`[GAME] Instance ${instanceId} has started with settings: rounds: ${instanceSettings[instanceId].rounds}, trackDuration: ${instanceSettings[instanceId].trackDuration}!`);
  res.send({ status: GameState.TRACK_SELECTION });
});

app.get("/api/game-status", (req, res) => {
  const { instanceId } = req.query;
  res.send({
    state: instanceStates[instanceId] || GameState.LOBBY,
    readyUsers: Object.keys(instanceReadyStates[instanceId] || {}),
    currentRound: instanceRounds[instanceId] || 1,
    isFinalRound: instanceRounds[instanceId] >= instanceSettings[instanceId]?.rounds
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

  const timeTaken = Date.now() - instanceTracks[instanceId].startTime;

  instanceGuesses[instanceId][currentRound][userId] = {
    text: guess,
    isCorrect: false,
    timeTaken: timeTaken
  };

  const readyUsers = Object.keys(instanceReadyStates[instanceId] || {});
  const guessers = Object.keys(instanceGuesses[instanceId][currentRound]);

  console.log(`[GUESS] ${guessers.length}/${readyUsers.length} players have guessed.`);

  if (guessers.length >= readyUsers.length) {
    instanceStates[instanceId] = GameState.ROUND_COMPLETED;
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
  const track = instanceTracks[instanceId];
  const guesses = instanceGuesses[instanceId]?.[round] || {};

  res.send({
    round: round,
    answer: track.answer,
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
    Object.entries(corrections).forEach(([userId, scoreValue]) => {
      const userGuess = instanceGuesses[instanceId][currentRound][userId];
      if (userGuess) {
        userGuess.scoreValue = scoreValue;
        userGuess.isCorrect = scoreValue > 0;
      }
    });
  }

  instanceStates[instanceId] = GameState.RESULTS;
  instanceReadyStates[instanceId] = {}; // Reset ready states for next round

  console.log(`[RESULTS] Host submitted corrections for instance ${instanceId}:`, corrections);
  res.send({ status: "success" });
});

app.get("/api/get-results", (req, res) => {
  const { instanceId, userId } = req.query;

  const state = instanceStates[instanceId];
  if (state !== GameState.RESULTS) {
    return res.status(400).send({ error: "Results not ready yet" });
  }

  const round = instanceRounds[instanceId];
  const roundGuesses = instanceGuesses[instanceId]?.[round] || {};
  const userGuess = roundGuesses[userId];
  const track = instanceTracks[instanceId];

  res.send({
    round: round,
    guess: userGuess,
    correctAnswer: track.answer
  });
});

app.post("/api/start-next-round", (req, res) => {
  const { instanceId, userId } = req.body;

  // Security check: only host can start
  if (instanceHosts[instanceId] !== userId) {
    return res.status(403).send({ error: "Only host can start" });
  }

  if (instanceRounds[instanceId] >= instanceSettings[instanceId].rounds) {
    instanceStates[instanceId] = GameState.GAME_FINISHED;
    calculateFinalResults(instanceId);
    console.log(`[GAME] Instance ${instanceId} has ended!`);
    return res.send({ status: GameState.GAME_FINISHED });
  }

  instanceRounds[instanceId] = instanceRounds[instanceId] + 1;
  instanceStates[instanceId] = GameState.TRACK_SELECTION;
  console.log(`[GAME] Instance ${instanceId} has started!`);
  res.send({ status: GameState.TRACK_SELECTION });
});

app.post("/api/play-local", (req, res) => {
  const { fileName, instanceId, userId } = req.body;

  // Security check: Only the host of this specific instance can change the music
  if (instanceHosts[instanceId] !== userId) {
    return res.status(403).send({ error: "Only the host can change tracks." });
  }

  const trackInfo = allTracks.find(t => t.file === fileName);

  const startTime = Date.now();
  const endTime = startTime + instanceSettings[instanceId].trackDuration;

  // Save track data specifically for this instance
  instanceTracks[instanceId] = {
    url: `/music/${fileName}`,
    startTime: startTime,
    endTime: endTime,
    answer: trackInfo ? trackInfo.name : null
  };

  instanceStates[instanceId] = GameState.PLAYING
  const currentRoundAtStart = instanceRounds[instanceId];

  setTimeout(() => {
    if (instanceStates[instanceId] === GameState.PLAYING && instanceRounds[instanceId] === currentRoundAtStart) {
      instanceStates[instanceId] = GameState.ROUND_COMPLETED;
      console.log(`[TIMER] Round ${currentRoundAtStart} expired for ${instanceId}`);
    }
  }, instanceSettings[instanceId].trackDuration);

  console.log(`[MUSIC] Instance ${instanceId} started playing ${fileName}`);
  res.send({ status: "playing", track: instanceTracks[instanceId], endTime: endTime });
});

app.get("/api/current-track", (req, res) => {
  const { instanceId } = req.query;

  const currentState = instanceStates[instanceId];

  if (currentState === GameState.PLAYING) {
    const track = instanceTracks[instanceId] || { url: null, startTime: 0 };
    return res.send(track);
  }

  res.send({ url: null, startTime: 0 });
});

app.get("/api/get-final-results", (req, res) => {
  const { instanceId } = req.query;

  if (instanceStates[instanceId] !== 'GAME_FINISHED') {
    return res.status(400).send({ error: "Game has not finished yet." });
  }

  res.send({ leaderboard: instanceFinalResults[instanceId] || [] });
});

function calculateFinalResults(instanceId) {
  const allRounds = instanceGuesses[instanceId] || {};
  const trackDuration = instanceSettings[instanceId]?.trackDuration || DEFAULT_TRACK_DURATION;
  const totalRoundsCount = instanceSettings[instanceId]?.rounds || 0;

  // Get the list of all users who actually played (ready states not perfect TODO later))
  const allUsers = Object.keys(instanceReadyStates[instanceId] || {});
  const userStats = {};

  // Initialize stats for every user to ensure they exist in the results
  allUsers.forEach(userId => {
    userStats[userId] = { total: 0, rounds: [] };
  });

  // 1. Iterate through every round that SHOULD have happened
  for (let r = 1; r <= totalRoundsCount; r++) {
    const roundGuesses = allRounds[r] || {};

    // Identify the fastest correct guess for this round
    let fastestUserId = null;
    let minTime = Infinity;

    Object.entries(roundGuesses).forEach(([userId, data]) => {
      if (data.scoreValue === 1 && data.timeTaken < minTime) {
        minTime = data.timeTaken;
        fastestUserId = userId;
      }
    });

    allUsers.forEach(userId => {
      const data = roundGuesses[userId]; // Might be undefined
      let pointsEarned = 0;
      let isFirst = userId === fastestUserId;

      if (data && data.isCorrect) {
        const timeTaken = data.timeTaken || trackDuration;
        const multiplier = Math.max(1, 2 - (timeTaken / trackDuration));
        let basePoints = BASE_POINTS * data.scoreValue;
        pointsEarned = Math.round(basePoints * multiplier);
        if (isFirst) {
          pointsEarned *= FIRST_BONUS_MULTIPLIER;
        }
      }

      // Round to avoid fractional points and ensure it's an integer
      pointsEarned = Math.round(pointsEarned);

      userStats[userId].total += pointsEarned;
      userStats[userId].rounds.push({
        round: r,
        guess: data ? data.text : "No guess submitted",
        points: pointsEarned,
        isCorrect: data ? data.isCorrect : false,
        isFirst: isFirst,
        time: data ? (data.timeTaken / 1000).toFixed(1) : (trackDuration / 1000).toFixed(1)
      });
    });
  }

  // 2. Format and Sort
  const sortedLeaderboard = Object.entries(userStats)
    .map(([userId, stats]) => ({
      userId,
      totalScore: stats.total,
      roundHistory: stats.rounds
    }))
    .sort((a, b) => b.totalScore - a.totalScore);

  instanceFinalResults[instanceId] = sortedLeaderboard;
  console.log(`[FINAL RESULTS] Instance ${instanceId} final leaderboard:`, JSON.stringify(instanceFinalResults[instanceId]));
}

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
