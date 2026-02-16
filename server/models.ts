import {
  DEFAULT_ROUNDS,
  DEFAULT_TRACK_DURATION,
  BASE_POINTS,
  FIRST_BONUS_MULTIPLIER,
  GameState
} from "./constants.js";

export class GameInstance {
  public registeredUsers: Set<string> = new Set();
  public hostId: string;
  public state: string = GameState.LOBBY;
  public currentRound: number = 0;
  public readyUsers: Set<string> = new Set();
  public settings: Settings;
  public trackInfo: TrackInfo | null = null;
  public guesses: Record<number, Record<string, UserGuess>> = {};
  public leaderboard: Leaderboard = new Leaderboard();
  public currentGame: number = 1;
  public trackHistory: string[] = [];
  public lastWinnerId: string | null = null;

  constructor(hostId: string) {
    this.hostId = hostId;
    this.settings = { rounds: DEFAULT_ROUNDS, trackDuration: DEFAULT_TRACK_DURATION };
  }

  public isHost(userId: string): boolean {
    return this.hostId === userId;
  }

  public startGame(rounds: number, trackDuration: number): void {
    this.settings = new Settings(rounds || DEFAULT_ROUNDS, (trackDuration * 1000) || DEFAULT_TRACK_DURATION);
    this.registeredUsers.forEach(userId => {
      if (this.isHost(userId)) return; // Skip host
      if (!this.leaderboard.hasEntry(userId)) {
        this.leaderboard.addEntry(new LeaderboardEntry(userId));
      }
    });
    this.state = GameState.TRACK_SELECTION;
    this.currentRound = 1;
  }

  public submitGuess(userId: string, guessText: string): { current: number; total: number } {
    if (!this.guesses[this.currentRound]) {
      this.guesses[this.currentRound] = {};
    }

    const timeTaken = this.trackInfo ? Date.now() - this.trackInfo.startTime : this.settings.trackDuration;

    this.guesses[this.currentRound]![userId] = new UserGuess(guessText, timeTaken);
    const totalPlayers = this.readyUsers.size;
    const guessersCount = Object.keys(this.guesses[this.currentRound] ?? {}).length;

    if (guessersCount >= totalPlayers) {
      this.state = GameState.ROUND_COMPLETED;
    }

    return { current: guessersCount, total: totalPlayers };
  }

  public getTimedOutPlayers(): string[] {
    const currentGuesses = this.guesses[this.currentRound] || {};

    // Convert Set to Array to use filter
    return Array.from(this.registeredUsers).filter(userId => !currentGuesses[userId] && !this.isHost(userId));
  }

  public submitResults(corrections: Record<string, number>): void {
    const roundGuesses = this.guesses[this.currentRound] || {};

    // 1. Update the guesses with host corrections
    Object.entries(corrections).forEach(([userId, scoreValue]) => {
      const userGuess = roundGuesses[userId];
      if (userGuess) {
        userGuess.scoreValue = Number(scoreValue);
        userGuess.isCorrect = Number(scoreValue) > 0;
      }
    });

    // 2. Identify the fastest correct guess for this round
    let fastestUserId = "";
    let minTime = Infinity;
    Object.entries(roundGuesses).forEach(([userId, data]) => {
      if (data.scoreValue === 1 && data.timeTaken < minTime) {
        minTime = data.timeTaken;
        fastestUserId = userId;
      }
    });

    // 3. Calculate and add RoundResult for every registered user
    this.registeredUsers.forEach(userId => {
      if (this.isHost(userId)) return; // Skip host

      const data = roundGuesses[userId];
      const isFirst = userId === fastestUserId;
      let pointsEarned = 0;

      if (data?.isCorrect) {
        const timeTaken = data.timeTaken || this.settings.trackDuration; // Fallback to max duration if missing
        const multiplier = Math.max(1, 2 - (timeTaken / this.settings.trackDuration));
        pointsEarned = BASE_POINTS * data.scoreValue * multiplier;
        if (isFirst) pointsEarned *= FIRST_BONUS_MULTIPLIER;
      }

      // Round to avoid fractional points and ensure it's an integer
      pointsEarned = Math.round(pointsEarned);

      // Find the user's existing entry and add this round
      const entry = this.leaderboard.getEntry(userId);
      if (entry) {
        entry.addRound(new RoundResult(
          this.currentRound,
          data?.text || "No Guess Submitted",
          pointsEarned,
          data?.isCorrect || false,
          isFirst,
          data ? (data.timeTaken / 1000).toFixed(1) : (this.settings.trackDuration / 1000).toFixed(1)
        ));
      }
    });

    this.state = GameState.RESULTS;
    this.readyUsers = new Set(); // Reset ready states for next round
  }

  public advanceRound(): string {
    if (this.currentRound >= this.settings.rounds) {
      this.state = GameState.GAME_FINISHED;
      this.lastWinnerId = this.leaderboard.getWinnerId();
    } else {
      this.state = GameState.TRACK_SELECTION;
      this.currentRound += 1;
    }

    return this.state;
  }

  public isFinalRound(): boolean {
    return this.currentRound >= this.settings.rounds;
  }

  public playTrack(fileName: string, trackName: string): void {
    const countdownDuration = 4000;
    const startTime = Date.now() + countdownDuration;
    const endTime = startTime + this.settings.trackDuration;

    this.trackInfo = new TrackInfo(`/music/${fileName}`, startTime, endTime, trackName);
    this.state = GameState.PLAYING;
    this.trackHistory.push(fileName);
    const roundAtStart = this.currentRound;

    const totalWaitTime = countdownDuration + this.settings.trackDuration;

    // Set a timer to automatically transition to ROUND_COMPLETED after trackDuration
    setTimeout(() => {
      if (this.state === GameState.PLAYING && this.currentRound === roundAtStart) {
        this.state = GameState.ROUND_COMPLETED;
        console.log(`[TIMER] Round ${roundAtStart} expired.`);
      }
    }, totalWaitTime);
  }

  public restart() {
    this.state = GameState.LOBBY;
    this.currentRound = 0;
    this.readyUsers = new Set();
    this.guesses = {};
    this.trackInfo = null;
    this.trackHistory = [];
    this.leaderboard = new Leaderboard();
    this.currentGame += 1;
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
  public userId: string;
  public totalScore: number = 0;
  public roundHistory: RoundResult[] = []; 

  constructor(userId: string) {
    this.userId = userId;
  }

  addRound(result: RoundResult) {
    const alreadyExists = this.roundHistory.some(r => r.round === result.round);
    if (alreadyExists) return;

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

  public hasEntry(userId: string): boolean {
    return this.entries.some(e => e.userId === userId);
  }

  public getEntry(userId: string): LeaderboardEntry | undefined {
    return this.entries.find(e => e.userId === userId);
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

  public getRoundResults(round: number): { userId: string; points: number }[] {
    return this.entries.map(entry => {
      const roundResult = entry.roundHistory.find(r => r.round === round);
      return { userId: entry.userId, points: roundResult?.points || 0 };
    });
  }

  public getWinnerId(): string | null {
    return this.entries[0]?.userId || null;
  }
}