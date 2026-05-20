export enum GameState {
  SETUP = 'SETUP',
  LOBBY = 'LOBBY',
  TRACK_SELECTION = 'TRACK_SELECTION',
  PLAYING = 'PLAYING',
  ROUND_COMPLETED = 'ROUND_COMPLETED',
  RESULTS = 'RESULTS',
  GAME_FINISHED = 'GAME_FINISHED'
}

export enum Joker {
  OBFUSCATION = 'OBFUSCATION',
  TRIVIA = 'TRIVIA',
  MULTIPLE_CHOICE = 'MULTIPLE_CHOICE',
  SPY = 'SPY'
}

export const MAX_VOLUME: number = 0.25;
export const DEFAULT_VOLUME_SLIDER_VAL: number = 0.5;
export const POLLING_INTERVAL: number = 500;
export const DEFAULT_TRACK_DURATION: number = 60000;
export const DEFAULT_ROUNDS: number = 5;
export const BASE_POINTS: number = 100;
export const FIRST_BONUS_MULTIPLIER: number = 1.2;
export const INT32_MAX_VALUE: number = 2**31 - 1;
export const COUNTDOWN_DURATION: number = 4000;