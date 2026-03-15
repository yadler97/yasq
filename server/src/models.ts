import {
  DEFAULT_ROUNDS,
  DEFAULT_TRACK_DURATION,
  BASE_POINTS,
  FIRST_BONUS_MULTIPLIER,
  GameState,
  Joker
} from "@yasq/shared";

export class GameInstance {
  public registeredUsers: Set<string> = new Set();
  public hostId: string | null;
  public state: string = GameState.SETUP;
  public currentRound: number = 0;
  public readyUsers: Set<string> = new Set();
  public guessedPlayers: Set<string> = new Set();
  public settings: Settings;
  public trackInfo: TrackInfo | null = null;
  public guesses: Record<number, Record<string, UserGuess>> = {};
  public leaderboard: Leaderboard = new Leaderboard();
  public currentGame: number = 1;
  public trackHistory: string[] = [];
  public lastWinnerId: string | null = null;
  public usedJokers: Record<string, Set<Joker>> = {};

  constructor(hostId: string) {
    this.hostId = hostId;
    this.settings = { rounds: DEFAULT_ROUNDS, trackDuration: DEFAULT_TRACK_DURATION, enabledJokers: new Set() };
  }

  public isHost(userId: string): boolean {
    return this.hostId === userId;
  }

  public setupGame(rounds: number, trackDuration: number, enabledJokers: Joker[]): void {
    this.settings = new Settings(
      rounds || DEFAULT_ROUNDS,
      (trackDuration * 1000) || DEFAULT_TRACK_DURATION,
      new Set(enabledJokers)
    );
    this.state = GameState.LOBBY;
  }

  public startGame(): void {
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
    const totalPlayers = Array.from(this.registeredUsers).filter(userId => !this.isHost(userId)).length;
    const guessersCount = Object.keys(this.guesses[this.currentRound] ?? {}).length;

    if (guessersCount >= totalPlayers) {
      this.state = GameState.ROUND_COMPLETED;
    }

    this.guessedPlayers.add(userId);

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
      const score = data?.scoreValue || 0;
      const isFirst = userId === fastestUserId;
      let pointsEarned = 0;

      if (score > 0) {
        const timeTaken = data?.timeTaken || this.settings.trackDuration; // Fallback to max duration if missing
        const multiplier = Math.max(1, 2 - (timeTaken / this.settings.trackDuration));
        pointsEarned = BASE_POINTS * score * multiplier;
        if (isFirst) pointsEarned *= FIRST_BONUS_MULTIPLIER;
      }

      // Round to avoid fractional points and ensure it's an integer
      pointsEarned = Math.round(pointsEarned);
      
      // Create new entry if not existing yet
      if (!this.leaderboard.hasEntry(userId)) {
        this.leaderboard.addEntry(new LeaderboardEntry(userId));
      }

      // Find the user's existing entry and add this round
      const entry = this.leaderboard.getEntry(userId);
      if (entry) {
        entry.addRound(new RoundResult(
          this.currentRound,
          data?.text || "No Guess Submitted",
          pointsEarned,
          data?.scoreValue || 0,
          isFirst,
          data ? (data.timeTaken / 1000).toFixed(1) : (this.settings.trackDuration / 1000).toFixed(1)
        ));
      }
    });

    this.state = GameState.RESULTS;
    this.guessedPlayers = new Set();
  }

  public advanceRound(): string {
    if (this.currentRound >= this.settings.rounds) {
      this.state = GameState.GAME_FINISHED;
      this.leaderboard.sort();
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

  public playTrack(track: Track): void {
    this.readyUsers = new Set();
    const countdownDuration = 4000;
    const startTime = Date.now() + countdownDuration;
    const endTime = startTime + this.settings.trackDuration;

    this.trackInfo = new TrackInfo(`/music/${track.file}.mp3`, startTime, endTime, track, `/game_covers/${track.file}.png`);
    this.state = GameState.PLAYING;
    this.trackHistory.push(track.file);
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
    this.state = GameState.SETUP;
    this.currentRound = 0;
    this.readyUsers = new Set();
    this.guesses = {};
    this.trackInfo = null;
    this.trackHistory = [];
    this.leaderboard = new Leaderboard();
    this.currentGame += 1;
    this.usedJokers = {};
  }

  public canUseJoker(userId: string, jokerType: Joker): boolean {
    if (!this.usedJokers[userId]) {
      this.usedJokers[userId] = new Set<Joker>();
    }

    if (this.usedJokers[userId].has(jokerType)) {
      return false;
    }

    return true;
  }

  public getPartialHint(revealPercent: number = 0.2): string {
    const title = this.trackInfo?.track.name;
    if (!title) return "";

    return title.split("").map(c => {
      // Keep special characters
      if (!/[a-zA-Z0-9]/.test(c)) return c;
      
      // Obfuscate the rest, but keep a few characters
      return Math.random() < revealPercent ? c : "_";
    }).join("");
  }

  public getTagHint(): Tag[] {
    return this.trackInfo?.track.tags || [];
  }

  public getMultipleChoiceHint(tracks: Track[]): string[] {
    const correctAnswer = this.trackInfo?.track.name;
    if (!correctAnswer) return [];

    // Get all unique game titles except the correct one
    const otherTitles = Array.from(new Set(
      tracks
        .map(t => t.name)
        .filter(title => title !== correctAnswer)
    ));

    // Randomly pick 3 wrong answers
    // We sort by a random value and take the first 3
    const wrongAnswers = otherTitles
      .sort(() => 0.5 - Math.random())
      .slice(0, 3);

    // Combine with the correct answer and shuffle the final 4
    const finalChoices = [correctAnswer, ...wrongAnswers];
    
    return finalChoices.sort(() => 0.5 - Math.random());
  }

  public markJokerUsed(userId: string, joker: Joker): void {
    if (!this.usedJokers[userId]) {
      this.usedJokers[userId] = new Set<Joker>();
    }
    
    this.usedJokers[userId].add(joker);
  }

  public pickNewHost(): boolean {
    const remainingPlayers = Array.from(this.registeredUsers);
    
    if (remainingPlayers.length === 0) {
      return false;
    }

    this.hostId = remainingPlayers[0] ?? null;
    return true;
  }

  toJSON() {
    return {
      ...this,
      // Convert Sets to Arrays (Sets serialize to {})
      registeredUsers: Array.from(this.registeredUsers),
      readyUsers: Array.from(this.readyUsers),
      guessedPlayers: Array.from(this.guessedPlayers),
    };
  }
}

export class Settings {
  constructor(
    public rounds: number,
    public trackDuration: number,
    public enabledJokers: Set<Joker>
  ) {}
}

export class Track {
  constructor(
    public file: string,
    public name: string,
    public title: string,
    public tags: Tag[]
  ) {}
}

export class Tag {
  constructor(
    public type: string,
    public value: string
  ) {}
}

export class TrackInfo {
  constructor(
    public url: string,
    public startTime: number,
    public endTime: number,
    public track: Track,
    public gameCoverUrl: string
  ) {}
}

export class UserGuess {
  constructor(
    public text: string,
    public timeTaken: number,
    public scoreValue: number = 0
  ) {}
}

export class RoundResult {
  constructor(
    public round: number,
    public guess: string | undefined,
    public points: number,
    public scoreValue: number,
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

  static fromJSON(data: any): LeaderboardEntry {
    const entry = new LeaderboardEntry(data.userId);
    entry.totalScore = data.totalScore || 0;
    entry.roundHistory = (data.roundHistory || []).map((r: any) => 
      new RoundResult(r.round, r.guess, r.points, r.scoreValue, r.isFirst, r.time)
    );
    return entry;
  }
}

export class Leaderboard {
  private entries: LeaderboardEntry[] = [];

  constructor(entries: LeaderboardEntry[] = []) {
    this.entries = entries;
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
  }

  public sort(): void {
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

  static fromJSON(data: any): Leaderboard {
    const entries = (data?.entries || []).map((e: any) => LeaderboardEntry.fromJSON(e));
    return new Leaderboard(entries);
  }
}