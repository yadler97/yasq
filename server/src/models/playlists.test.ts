import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'fs';

import { LogCategory, logger } from '../utils/logger.js';
import { loadPlaylists } from './playlists.js';
import { setServerRootDir } from '../utils/helper.js';

vi.mock('fs');

const serverDir: string = process.cwd();

let warnSpy: ReturnType<typeof vi.spyOn>;
let infoSpy: ReturnType<typeof vi.spyOn>;

beforeAll(() => {
  setServerRootDir(serverDir);
});

beforeEach(() => {
  vi.resetAllMocks();
  warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {});
  infoSpy = vi.spyOn(logger, 'info').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('loadPlaylists', () => {
  it('should load valid playlists file', () => {
    const customPlaylists = [
      {
        name: 'Playlist 1',
        tracks: ['track001.mp3', 'track002.mp3'],
      },
      {
        name: 'Playlist 2',
        tracks: ['track003.mp3'],
      },
    ];

    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(customPlaylists));

    const result = loadPlaylists('playlists.json');

    expect(result).toEqual(customPlaylists);
    expect(infoSpy).toHaveBeenCalledWith("Loading playlists from 'playlists.json'.", LogCategory.SETUP);
  });

  it('should log a warning and return empty array on invalid playlist properties', () => {
    const invalidPlaylists = [
      {
        name: '', // Invalid: empty string
        tracks: 'track001.mp3', // Invalid: not an array
      },
    ];

    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(invalidPlaylists));

    const result = loadPlaylists('playlists.json');

    expect(result).toEqual([]);
    expect(warnSpy).toHaveBeenCalledTimes(1);

    const loggedWarning = warnSpy.mock.calls[0][0];
    expect(loggedWarning).toContain("Found 2 invalid configuration properties in playlists file 'playlists.json':");
    expect(loggedWarning).toContain(
      '1. Item 1: Property \'name\' received invalid value "" (Too small: expected string to have >=1 characters).'
    );
    expect(loggedWarning).toContain(
      '2. Item 1: Property \'tracks\' received invalid value "track001.mp3" (Invalid input: expected array, received string).'
    );
  });

  it('should log a warning and return empty array when playlist file is missing', () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);

    const result = loadPlaylists('missing.json');

    expect(result).toEqual([]);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0][0]).toContain("Playlists file not found at 'missing.json'.");
  });
});
