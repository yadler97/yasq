import fs from 'fs';
import { z } from 'zod';

import { type Playlist } from '@yasq/shared';

import { LogCategory, logger } from '../utils/logger.js';
import { formatValidationError, resolveProperty, type ValidationIssue } from '../utils/validate_config.js';

const playlistSchema = z.object({
  name: z.string().nonempty(),
  tracks: z.array(z.string().nonempty()),
});

const playlistListSchema = z.array(playlistSchema);

/**
 * Loads playlists from a given JSON config path.
 * Logs a warning and returns an empty array if the file is missing, invalid JSON, or fails validation.
 */
export function loadPlaylists(configPath: string): Playlist[] {
  if (!fs.existsSync(configPath)) {
    logger.warn(`Playlists file not found at '${configPath}'. Skipping playlist loading.`, LogCategory.SETUP, null);
    return [];
  }

  let parsedConfig: unknown;
  try {
    const fileContent = fs.readFileSync(configPath, 'utf-8');
    parsedConfig = JSON.parse(fileContent);
  } catch (err) {
    logger.warn(`Error parsing JSON from playlists file '${configPath}': ${err}`, LogCategory.SETUP, null);
    return [];
  }

  logger.info(`Loading playlists from '${configPath}'.`, LogCategory.SETUP);

  const result = playlistListSchema.safeParse(parsedConfig);

  if (!result.success) {
    const issues: ValidationIssue[] = [];

    for (const issue of result.error.issues) {
      const pathArr = issue.path;
      const itemIndex = typeof pathArr[0] === 'number' ? pathArr[0] + 1 : -1;
      const propertySubPath = pathArr.slice(1);
      const propertyPath = propertySubPath.length ? propertySubPath.join('.') : 'root';

      issues.push({
        itemIndex,
        propertyPath,
        errorMessage: issue.message,
        inputValue: resolveProperty(parsedConfig, pathArr),
      });
    }

    const pluralized = issues.length === 1 ? 'property' : 'properties';
    const warningMessage =
      `Found ${issues.length} invalid configuration ${pluralized} in playlists file '${configPath}':\n` +
      issues.map(formatValidationError).join('\n');

    logger.warn(warningMessage, LogCategory.SETUP, null);
    return [];
  }

  return result.data as Playlist[];
}
