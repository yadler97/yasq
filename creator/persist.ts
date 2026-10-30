import type { Plugin } from 'vite';
import fs from 'fs';
import path from 'path';

export function persistPlugin(): Plugin {
  return {
    name: 'persist',
    configureServer(server) {
      const dataDir = path.resolve(process.cwd(), 'data');
      const tracksFile = path.join(dataDir, 'tracks.json');

      // GET existing tracks
      server.middlewares.use('/api/tracks', async (req, res) => {
        if (req.method !== 'GET') return;
        try {
          let existingTracks = [];
          if (fs.existsSync(tracksFile)) {
            existingTracks = JSON.parse(fs.readFileSync(tracksFile, 'utf-8'));
          }
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(existingTracks));
        } catch (err: any) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: err.message }));
        }
      });

      server.middlewares.use('/api/save-track', async (req, res) => {
        if (req.method !== 'POST') return;

        const chunks: Buffer[] = [];
        req.on('data', chunk => chunks.push(chunk));
        req.on('end', async () => {
          try {
            const buffer = Buffer.concat(chunks);

            fs.mkdirSync(dataDir, { recursive: true });

            // Read existing tracks or start fresh
            let existingTracks = [];
            if (fs.existsSync(tracksFile)) {
              existingTracks = JSON.parse(fs.readFileSync(tracksFile, 'utf-8'));
            }

            // Parse incoming JSON body (or handle multipart payload)
            const payload = JSON.parse(buffer.toString());
            existingTracks.push(payload);

            // Atomically write back to local disk
            fs.writeFileSync(tracksFile, JSON.stringify(existingTracks, null, 2));

            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true }));
          } catch (err: any) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: err.message }));
          }
        });
      });
    },
  };
}
