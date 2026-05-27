import { GameSettings, Joker, TimeBonus } from "@yasq/shared";

/** Extension of the {@link TimeBonus} enum for selection in the UI */
export const OptionalTimeBonus = {
  ...TimeBonus,
  NONE: 'NONE',
} as const;

// Derive TypeScript type from the runtime object
export type TOptionalTimeBonus = typeof OptionalTimeBonus[keyof typeof OptionalTimeBonus];


export interface Participant {
  id: string;
  username: string;
  nickname?: string;
  global_name?: string;
  avatar?: string;
}

export interface GameStatus {
  state: string;
  hostId: string | null;
  readyUsers: string[];
  guessedPlayers: string[],
  currentRound: number;
  isFinalRound: boolean;
  lastWinnerId: string | null;
  gameSettings: GameSettings;
}

export interface Track {
  game: string;
  title: string;
  audio: string;
  cover: string;
  played: boolean;
  tags: Tag[];
  originalIndex?: number;
}

export interface Tag {
  type: string;
  value: string;
}

export interface Playlist {
  name: string;
  tracks: string[];
}

export interface ReviewData {
  round: number;
  answer: string;
  guesses: Record<string, { text: string, joker: Joker }>;
  timedOut: string[];
}