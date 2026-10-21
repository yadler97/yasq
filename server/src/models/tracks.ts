import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import { getFilePath, stringify } from '../utils/helper.js';
import { GAME_COVERS_DIR, TRACK_AUDIO_DIR, type Track } from '@yasq/shared';
import { LogCategory, logger } from '../utils/logger.js';

interface ValidationIssue {
  propertyPath: string;
  errorMessage: string;
  inputValue: unknown;
  itemIndex?: number;
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly exitCode: number
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Resolves the given path of property keys on an initial object. That is, this function follows nested properties
 * within `root` according to the property keys listed in `path` and returns the **value of the property** reached at the end
 * of this path.
 *
 * If resolving the path fails at any point, the function simply returns the `root` object/value.
 */
const resolveProperty = (root: unknown, path: readonly PropertyKey[] | undefined): unknown => {
  let current: unknown = root;

  if (path?.length) {
    for (const key of path) {
      if (typeof current !== 'object' || current === null) return root; // Failure: Current has no properties

      current = (current as Record<PropertyKey, unknown>)[key];
      if (current === undefined) return root; // Failure: Property [key] did not exist
    }
  }

  return current;
};

const formatValidationError = (issue: ValidationIssue, issueIndex: number): string => {
  const itemLabel: string = `  ${issueIndex + 1}.`;
  const indexText = issue.itemIndex !== -1 ? `Item ${issue.itemIndex}: ` : '';

  return (
    `${itemLabel} ${indexText}Property '${issue.propertyPath}' received invalid value ${stringify(issue.inputValue)} ` +
    `(${issue.errorMessage}).`
  );
};

const trackSchema = z.object({
  game: z.string().nonempty(),
  title: z.string().nonempty(),

  audio: z
    .string()
    .nonempty()
    .refine(
      audioFilename => {
        const absolutePath = getFilePath(path.join(TRACK_AUDIO_DIR, audioFilename));
        return fs.existsSync(absolutePath);
      },
      { message: 'Audio file does not exist in the designated track audio directory' }
    ),

  cover: z
    .string()
    .nonempty()
    .optional()
    .refine(
      coverFilename => {
        if (!coverFilename) return true;
        const absolutePath = getFilePath(path.join(GAME_COVERS_DIR, coverFilename));
        return fs.existsSync(absolutePath);
      },
      { message: 'Cover file does not exist in the designated game covers directory' }
    ),

  tags: z
    .array(
      z.object({
        type: z.string().nonempty(),
        value: z.string().nonempty(),
      })
    )
    .optional(),
});

const trackListSchema = z.array(trackSchema);

/**
 * Loads and strictly validates tracks from a given JSON config path.
 * Checks that audio and optional cover files exist within their respective directories.
 */
export function loadTracks(configPath: string): Track[] {
  if (!fs.existsSync(configPath)) {
    throw new ValidationError(`Tracks file not found at '${configPath}'.`, 20);
  }

  let parsedConfig: unknown;
  try {
    const fileContent = fs.readFileSync(configPath, 'utf-8');
    parsedConfig = JSON.parse(fileContent);
  } catch (err) {
    throw new ValidationError(`Error parsing JSON from ${configPath}: ${err}`, 21);
  }

  logger.info(`Loading tracks from '${configPath}'.`, LogCategory.SETUP);

  const result = trackListSchema.safeParse(parsedConfig);

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
    const errorMessage =
      `Found ${issues.length} invalid configuration ${pluralized} in '${configPath}':\n` +
      issues.map(formatValidationError).join('\n');
    throw new ValidationError(errorMessage, 22);
  }

  logger.info(`Successfully loaded ${result.data.length} tracks from '${configPath}'.`, LogCategory.SETUP);
  return result.data as Track[];
}
