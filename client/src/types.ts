export interface Participant {
  id: string;
  username: string;
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
}

export interface Track {
  name: string,
  title: string,
  file: string,
  played: boolean
}