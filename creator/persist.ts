import type { Plugin } from 'vite';
import fs from 'fs';
import path from 'path';

import { Track } from '@yasq/shared';

export function persistPlugin(): Plugin {
  return {
    name: 'persist',
    configureServer(server) {
      const dataDir = path.resolve(process.cwd(), 'data');
      const tracksFile = path.join(dataDir, 'tracks.json');

      const readTracks = (): Track[] => {
        if (!fs.existsSync(tracksFile)) return [];
        return JSON.parse(fs.readFileSync(tracksFile, 'utf-8'));
      };

      const writeTracks = (tracks: Track[]) => {
        fs.mkdirSync(dataDir, { recursive: true });
        fs.writeFileSync(tracksFile, JSON.stringify(tracks, null, 2));
      };

      server.middlewares.use('/api/tracks', async (req, res) => {
        // Parse URL to isolate path parameters (e.g., /api/tracks/:id)
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
                const body = JSON.parse(Buffer.concat(chunks).toString());
                const tracks = readTracks();

                // Assign a unique ID if not present
                const newTrack = { id: body.id || Date.now().toString(), ...body };
                tracks.push(newTrack);

                writeTracks(tracks);

                res.statusCode = 201; // Created
                return res.end(JSON.stringify(newTrack));
              } catch {
                res.statusCode = 400; // Bad Request
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
                const body = JSON.parse(Buffer.concat(chunks).toString());
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
