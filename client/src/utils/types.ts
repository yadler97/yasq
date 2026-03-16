import { Joker } from "@yasq/shared";

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
  rounds: number;
  trackDuration: number;
  enabledJokers: Joker[];
}

export interface Track {
  game: string,
  title: string,
  audio: string,
  cover: string,
  played: boolean,
  tags: Tag[]
}

export interface Tag {
  type: string;
  value: string;
}

export interface Playlist {
  name: string;
  tracks: string[];
}