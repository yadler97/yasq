import { GameState } from "./constants.js";

export class GameInstance {
  public hostId: string;
  public state: string = GameState.LOBBY;
  public currentRound: number = 0;
  public readyUsers: Set<string> = new Set();
  public settings: Settings;
  public trackInfo: TrackInfo = new TrackInfo("", 0, 0, "");
  public guesses: Record<number, Record<string, UserGuess>> = {};
  public leaderboard: Leaderboard = new Leaderboard();
  public currentGame: number = 1;

  constructor(hostId: string) {
    this.hostId = hostId;
    this.settings = { rounds: 5, trackDuration: 30000 };
  }

  public isHost(userId: string): boolean {
    return this.hostId === userId;
  }
}

export class Settings {
  constructor(
    public rounds: number,
    public trackDuration: number
  ) {}
}

export class TrackInfo {
  constructor(
    public url: string,
    public startTime: number,
    public endTime: number,
    public answer: string
  ) {}
}

export class UserGuess {
  constructor(
    public text: string,
    public timeTaken: number,
    public isCorrect: boolean = false,
    public scoreValue: number = 0
  ) {}
}

export class RoundResult {
  constructor(
    public round: number,
    public guess: string | undefined,
    public points: number,
    public isCorrect: boolean,
    public isFirst: boolean,
    public time: string
  ) {}
}

export class LeaderboardEntry {
  public totalScore: number = 0;
  public roundHistory: RoundResult[] = []; 

  constructor(public userId: string) {}

  addRound(result: RoundResult) {
    this.roundHistory.push(result);
    this.totalScore += result.points;
  }
}

export class Leaderboard {
  private entries: LeaderboardEntry[] = [];

  constructor(entries: LeaderboardEntry[] = []) {
    this.entries = entries;
    this.sort();
  }

  // Add an entry and maintain the sorted order
  public addEntry(entry: LeaderboardEntry): void {
    this.entries.push(entry);
    this.sort();
  }

  private sort(): void {
    this.entries.sort((a, b) => b.totalScore - a.totalScore);
  }

  public getAll(): LeaderboardEntry[] {
    return this.entries;
  }
}