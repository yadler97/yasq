import { Connect } from 'vite';
import fs from 'fs';
import http from 'http';

import { paths } from './paths.js';

interface PermissionRule {
  type: 'whitelist' | 'blacklist';
  userIds: string[];
  files: string[];
}

function isPermissionRules(value: unknown): value is PermissionRule[] {
  return (
    Array.isArray(value) &&
    value.every(
      rule =>
        typeof rule === 'object' &&
        rule !== null &&
        (rule.type === 'whitelist' || rule.type === 'blacklist') &&
        Array.isArray(rule.userIds) &&
        rule.userIds.every((userId: unknown) => typeof userId === 'string') &&
        Array.isArray(rule.files) &&
        rule.files.every((file: unknown) => typeof file === 'string')
    )
  );
}

function readPermissions(): PermissionRule[] {
  if (!fs.existsSync(paths.permissionsFile)) return [];

  const permissions: unknown = JSON.parse(fs.readFileSync(paths.permissionsFile, 'utf-8'));
  if (!isPermissionRules(permissions)) {
    throw new Error('Permissions file must contain an array of valid permission rules.');
  }
  return permissions;
}

export function registerPermissionsMiddleware(server: { middlewares: Connect.Server }) {
  server.middlewares.use('/api/permissions', (req: http.IncomingMessage, res: http.ServerResponse) => {
    res.setHeader('Content-Type', 'application/json');

    try {
      if (req.method === 'GET') {
        return res.end(JSON.stringify(readPermissions()));
      }

      if (req.method === 'PUT') {
        const chunks: Buffer[] = [];
        req.on('data', (chunk: Buffer) => chunks.push(chunk));
        req.on('end', () => {
          try {
            const permissions: unknown = JSON.parse(Buffer.concat(chunks).toString('utf-8'));
            if (!isPermissionRules(permissions)) {
              res.statusCode = 400;
              return res.end(JSON.stringify({ error: 'Invalid permission rules.' }));
            }

            fs.mkdirSync(paths.baseDir, { recursive: true });
            fs.writeFileSync(paths.permissionsFile, JSON.stringify(permissions, null, 2));
            return res.end(JSON.stringify(permissions));
          } catch (error) {
            res.statusCode = 400;
            return res.end(
              JSON.stringify({ error: error instanceof Error ? error.message : 'Invalid permission rules.' })
            );
          }
        });
        return;
      }

      res.statusCode = 405;
      return res.end(JSON.stringify({ error: `Method ${req.method} not allowed` }));
    } catch (error) {
      console.error('Failed to access permissions file:', error);
      res.statusCode = 500;
      return res.end(
        JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to access permissions file.' })
      );
    }
  });
}
