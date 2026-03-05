import { Joker } from "../constants";

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
  currentRound: number;
  isFinalRound: boolean;
  lastWinnerId: string | null;
  rounds: number;
  trackDuration: number;
  enabledJokers: Joker[];
}

export interface Track {
  name: string,
  title: string,
  file: string,
  played: boolean
}

export interface Playlist {
  name: string;
  tracks: string[];
}