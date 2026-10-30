import type { Plugin } from 'vite';
import fs from 'fs';
import path from 'path';

import { GAME_COVERS_DIR, STATIC_FILES_DIR, Track, TRACK_AUDIO_DIR } from '@yasq/shared';

export function persistPlugin(): Plugin {
  return {
    name: 'persist',
    configureServer(server) {
      const baseDir = path.resolve(process.cwd(), '../server', STATIC_FILES_DIR, 'creator');
      const tracksFile = path.join(baseDir, 'tracks.json');
      const musicDir = path.join(baseDir, TRACK_AUDIO_DIR);
      const coversDir = path.join(baseDir, GAME_COVERS_DIR);

      const readTracks = (): Track[] => {
        if (!fs.existsSync(tracksFile)) return [];
        return JSON.parse(fs.readFileSync(tracksFile, 'utf-8'));
      };

      const writeTracks = (tracks: Track[]) => {
        fs.mkdirSync(baseDir, { recursive: true });
        fs.writeFileSync(tracksFile, JSON.stringify(tracks, null, 2));
      };

      // Serve static audio files
      server.middlewares.use('/music', (req, res, next) => {
        const filePath = path.join(musicDir, req.url || '');
        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
          return fs.createReadStream(filePath).pipe(res);
        }
        next();
      });

      // Serve static cover images
      server.middlewares.use('/covers', (req, res, next) => {
        const filePath = path.join(coversDir, req.url || '');
        if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
          return fs.createReadStream(filePath).pipe(res);
        }
        next();
      });

      // Handle raw binary audio file uploads
      server.middlewares.use('/api/upload', async (req, res) => {
        if (req.method !== 'POST') return;

        const url = new URL(req.url || '', `http://${req.headers.host}`);
        const type = url.searchParams.get('type');
        const targetDir = type === 'cover' ? coversDir : musicDir;

        const defaultName = type === 'cover' ? 'cover.jpg' : 'audio.mp3';
        const filename = decodeURIComponent((req.headers['x-file-name'] as string) || defaultName);

        fs.mkdirSync(targetDir, { recursive: true });
        const targetPath = path.join(targetDir, filename);

        const writeStream = fs.createWriteStream(targetPath);
        req.pipe(writeStream);

        req.on('end', () => {
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ filename }));
        });

        req.on('error', () => {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: 'Failed to upload file' }));
        });
      });

      // RESTful /api/tracks endpoints (GET, POST, PUT, DELETE using implicit index)
      server.middlewares.use('/api/tracks', async (req, res) => {
        const url = new URL(req.url || '', `http://${req.headers.host}`);
        const pathSegments = url.pathname.split('/').filter(Boolean);
        const indexParam = pathSegments[0] !== undefined ? parseInt(pathSegments[0], 10) : NaN;

        res.setHeader('Content-Type', 'application/json');

        try {
          // GET /api/tracks -> List all tracks
          if (req.method === 'GET' && Number.isNaN(indexParam)) {
            const tracks = readTracks();
            res.statusCode = 200;
            return res.end(JSON.stringify(tracks));
          }

          // GET /api/tracks/:index -> Get single track by index
          if (req.method === 'GET' && !Number.isNaN(indexParam)) {
            const tracks = readTracks();
            if (indexParam < 0 || indexParam >= tracks.length) {
              res.statusCode = 404;
              return res.end(JSON.stringify({ error: 'Track not found' }));
            }
            res.statusCode = 200;
            return res.end(JSON.stringify(tracks[indexParam]));
          }

          // POST /api/tracks -> Create a new track
          if (req.method === 'POST') {
            const chunks: Buffer[] = [];
            req.on('data', chunk => chunks.push(chunk));
            req.on('end', () => {
              try {
                const body = JSON.parse(Buffer.concat(chunks).toString()) as Track;
                const tracks = readTracks();
                tracks.push(body);
                writeTracks(tracks);

                res.statusCode = 201;
                return res.end(JSON.stringify(body));
              } catch {
                res.statusCode = 400;
                return res.end(JSON.stringify({ error: 'Invalid JSON payload' }));
              }
            });
            return;
          }

          // PUT /api/tracks/:index -> Update an existing track
          if (req.method === 'PUT' && !Number.isNaN(indexParam)) {
            const chunks: Buffer[] = [];
            req.on('data', chunk => chunks.push(chunk));
            req.on('end', () => {
              try {
                const body = JSON.parse(Buffer.concat(chunks).toString()) as Track;
                const tracks = readTracks();

                if (indexParam < 0 || indexParam >= tracks.length) {
                  res.statusCode = 404;
                  return res.end(JSON.stringify({ error: 'Track not found' }));
                }

                tracks[indexParam] = body;
                writeTracks(tracks);

                res.statusCode = 200;
                return res.end(JSON.stringify(tracks[indexParam]));
              } catch {
                res.statusCode = 400;
                return res.end(JSON.stringify({ error: 'Invalid JSON payload' }));
              }
            });
            return;
          }

          // DELETE /api/tracks/:index -> Delete a track
          if (req.method === 'DELETE' && !Number.isNaN(indexParam)) {
            const tracks = readTracks();

            if (indexParam < 0 || indexParam >= tracks.length) {
              res.statusCode = 404;
              return res.end(JSON.stringify({ error: 'Track not found' }));
            }

            tracks.splice(indexParam, 1);
            writeTracks(tracks);

            res.statusCode = 204;
            return res.end();
          }

          // Fallthrough for unhandled HTTP methods or paths
          res.statusCode = 405; // Method Not Allowed
          return res.end(JSON.stringify({ error: `Method ${req.method} not allowed` }));
        } catch (err: any) {
          res.statusCode = 500;
          return res.end(JSON.stringify({ error: err.message }));
        }
      });
    },
  };
}
