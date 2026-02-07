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
  console.log(`[GAME] Instance ${instanceId} has started!`);
  res.send({ status: 'PLAYING' });
});

app.get("/api/game-status", (req, res) => {
  const { instanceId } = req.query;
  res.send({
    state: instanceStates[instanceId] || 'LOBBY',
    readyUsers: Object.keys(instanceReadyStates[instanceId] || {}),
    currentRound: 1 // Placeholder
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
  console.log(`[GAME] Instance ${instanceId} received guess "${guess}" from user ${userId}`);
});

app.post("/api/play-local", (req, res) => {
  const { fileName, instanceId, userId } = req.body;

  // Security check: Only the host of this specific instance can change the music
  if (instanceHosts[instanceId] !== userId) {
    return res.status(403).send({ error: "Only the host can change tracks." });
  }
  
  // Save track data specifically for this instance
  instanceTracks[instanceId] = {
    url: `/music/${fileName}`,
    startTime: Date.now()
  };
  
  console.log(`[MUSIC] Instance ${instanceId} started playing ${fileName}`);
  res.send({ status: "playing", track: instanceTracks[instanceId] });
});

app.get("/api/current-track", (req, res) => {
  const { instanceId } = req.query; 
  
  const track = instanceTracks[instanceId] || { url: null, startTime: 0 };
  res.send(track);
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
