import {
  DEFAULT_ROUNDS,
  DEFAULT_TRACK_DURATION,
  BASE_POINTS,
  FIRST_BONUS_MULTIPLIER,
  GameState
} from "./constants.js";

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

  public startGame(rounds: number, trackDuration: number): void {
    this.settings = new Settings(rounds || DEFAULT_ROUNDS, (trackDuration * 1000) || DEFAULT_TRACK_DURATION);
    this.state = GameState.TRACK_SELECTION;
    this.currentRound = 1;
  }

  public submitGuess(userId: string, guessText: string): { current: number; total: number } {
    if (!this.guesses[this.currentRound]) {
      this.guesses[this.currentRound] = {};
    }

    const timeTaken = Date.now() - this.trackInfo.startTime;

    this.guesses[this.currentRound]![userId] = new UserGuess(guessText, timeTaken);
    const totalPlayers = this.readyUsers.size;
    const guessersCount = Object.keys(this.guesses[this.currentRound] ?? {}).length;

    if (guessersCount >= totalPlayers) {
      this.state = GameState.ROUND_COMPLETED;
    }

    return { current: guessersCount, total: totalPlayers };
  }

  public submitResults(corrections: Record<string, number>): void {
    if (this.guesses[this.currentRound]) {
      Object.entries(corrections).forEach(([userId, scoreValue]) => {
        const roundGuesses = this.guesses[this.currentRound] || {};
        const userGuess = roundGuesses[userId];
        if (userGuess) {
          userGuess.scoreValue = Number(scoreValue);
          userGuess.isCorrect = Number(scoreValue) > 0;
        }
      });
    }

    this.state = GameState.RESULTS;
    this.readyUsers = new Set(); // Reset ready states for next round
  }

  public advanceRound(): string {
    if (this.currentRound >= this.settings.rounds) {
      this.state = GameState.GAME_FINISHED;
      this.calculateFinalResults();
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

  public calculateFinalResults(): void {
    const allUsers = [...this.readyUsers];
    const newLeaderboard = new Leaderboard();

    // Calculate everything for each user one by one
    allUsers.forEach(userId => {
      const entry = new LeaderboardEntry(userId);

      // Iterate through every round that SHOULD have happened
      for (let r = 1; r <= this.settings.rounds; r++) {
        const roundGuesses = this.guesses[r] || {};

        // Identify the fastest correct guess for this round
        let fastestUserId = "";
        let minTime = Infinity;

        Object.entries(roundGuesses).forEach(([userId, data]) => {
          if (data.scoreValue === 1 && data.timeTaken < minTime) {
            minTime = data.timeTaken;
            fastestUserId = userId;
          }
        });

        const data = roundGuesses[userId];
        const isFirst = userId === fastestUserId;
        let pointsEarned = 0;

        if (data?.isCorrect) {
          const timeTaken = data.timeTaken || this.settings.trackDuration; // Fallback to max duration if missing
          const multiplier = Math.max(1, 2 - (timeTaken / this.settings.trackDuration));
          pointsEarned = BASE_POINTS * data.scoreValue * multiplier;
          if (isFirst) {
            pointsEarned *= FIRST_BONUS_MULTIPLIER;
          }
        }

        // Round to avoid fractional points and ensure it's an integer
        pointsEarned = Math.round(pointsEarned);

        entry.addRound(new RoundResult(
          r,
          data?.text,
          pointsEarned,
          data?.isCorrect || false,
          isFirst,
          data ? (data.timeTaken / 1000).toFixed(1) : (this.settings.trackDuration / 1000).toFixed(1)
        ));
      }
      newLeaderboard.addEntry(entry);
    });

    this.leaderboard = newLeaderboard;
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