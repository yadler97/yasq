import express from "express";
import dotenv from "dotenv";
import path from "path";
import fs from 'fs';
import { fileURLToPath } from 'url';

import { GameInstance } from './models.js';

import { setupRoutes } from "./routes/routes.js";
import { setupMockRoutes } from "./routes/mockRoutes.js";

dotenv.config({ path: "../.env" });

const isMockMode = process.env.VITE_MOCK_MODE === 'true'

const app = express();
const port = 3001;

const instances: Record<string, GameInstance> = {};

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const tracksPath = isMockMode 
  ? path.join(__dirname, '..', 'mock_data', 'mockTracks.json')
  : path.join(__dirname, 'data', 'tracks.json');

const tracksRaw = fs.readFileSync(tracksPath, 'utf-8');
const allTracks = JSON.parse(tracksRaw);

const playlistsPath = isMockMode 
  ? path.join(__dirname, '..', 'mock_data', 'mockTracks.json')
  : path.join(__dirname, 'data', 'playlists.json');

const playlistsRaw = fs.readFileSync(playlistsPath, 'utf-8');
const allPlaylists = JSON.parse(playlistsRaw);

// Allow express to parse JSON bodies
app.use(express.json());
app.use('/music', express.static(path.join(__dirname, 'music')));
app.use('/game_covers', express.static(path.join(__dirname, 'game_covers')));

// Register routes
app.use('/api', setupRoutes(instances, isMockMode, allTracks, allPlaylists));

// Only register mock routes when server is started in mock mode
if (isMockMode) {
  console.log('[MODE] Server is running in mock mode')
  app.use('/api/test', setupMockRoutes(instances));
}

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
