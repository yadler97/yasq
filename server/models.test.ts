import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GameInstance, Leaderboard, LeaderboardEntry, RoundResult, TrackInfo, UserGuess } from './models.js';
import { GameState } from './constants.js';

const HOST = "host_123";
const PLAYER_1 = "player_123"
const PLAYER_2 = "player_456"

const TRACK_A = "track_a"
const TRACK_B = "track_b"

describe('GameInstance - startGame', () => {
  let game: GameInstance;

  beforeEach(() => {
    game = new GameInstance(HOST);
    game.registeredUsers.add(HOST);
    game.registeredUsers.add(PLAYER_1);
  });

  it('should initialize settings and transition state', () => {
    // Start game with 5 rounds and 15 seconds
    game.setupGame(5, 15);
    game.startGame();

    // Assert state and current round
    expect(game.state).toBe(GameState.TRACK_SELECTION);
    expect(game.currentRound).toBe(1);

    // Assert settings (15s should become 15000ms)
    expect(game.settings.rounds).toBe(5);
    expect(game.settings.trackDuration).toBe(15000);
  });

  it('should add players to leaderboard but exclude the host', () => {
    game.setupGame(5, 15);
    game.startGame();

    const entries = game.leaderboard.getAll();
    
    // Verify player is there
    const hasPlayer = entries.some(e => e.userId === PLAYER_1);
    // Verify host is NOT there
    const hasHost = entries.some(e => e.userId === HOST);

    expect(hasPlayer).toBe(true);
    expect(hasHost).toBe(false);
    expect(entries.length).toBe(1);
  });
});

describe('GameInstance - submitGuess', () => {
  let game: GameInstance;

  beforeEach(() => {
    vi.useFakeTimers(); // Intercept Date.now()
    game = new GameInstance(HOST);
    game.registeredUsers.add(PLAYER_1);
    game.registeredUsers.add(PLAYER_2);

    // Simulate game already started and in selection state
    game.readyUsers = new Set([PLAYER_1, PLAYER_2]);
    game.currentRound = 1;
    game.trackInfo = new TrackInfo("url", Date.now(), Date.now() + 10000, "answer", "title", "cover")
  });

  it('should calculate timeTaken correctly using fake timers', () => {
    // Fast forward time by 4.5 seconds
    vi.advanceTimersByTime(4500);

    game.submitGuess(PLAYER_1, TRACK_A);

    const guess = game.guesses[1]![PLAYER_1];
    expect(guess?.timeTaken).toBe(4500);
    expect(guess?.text).toBe(TRACK_A);
  });

  it('should transition to ROUND_COMPLETED when the last player guesses', () => {
    // First player guesses
    const progress1 = game.submitGuess(PLAYER_1, TRACK_A);
    expect(progress1.current).toBe(1);
    expect(game.state).not.toBe(GameState.ROUND_COMPLETED);

    // Second (last) player guesses
    const progress2 = game.submitGuess(PLAYER_2, TRACK_B);
    expect(progress2.current).toBe(2);
    expect(progress2.total).toBe(2);

    // Check state transition
    expect(game.state).toBe(GameState.ROUND_COMPLETED);
  });
});

describe('GameInstance - getTimedOutPlayers', () => {
  it('should return list of players who have not submitted a guess', () => {
    const game = new GameInstance(HOST);
    game.registeredUsers.add(PLAYER_1);
    game.registeredUsers.add(PLAYER_2);
    game.submitGuess(PLAYER_1, TRACK_A);

    const timedOutPlayers = game.getTimedOutPlayers();
    expect(timedOutPlayers).toStrictEqual([PLAYER_2])
  });
});

describe('GameInstance - submitResults', () => {
  let game: GameInstance;

  beforeEach(() => {
    game = new GameInstance(HOST);
    game.registeredUsers.add(PLAYER_1);
    game.registeredUsers.add(PLAYER_2);
    game.setupGame(10, 20); // 20s duration = 20000ms
    game.startGame();

    // Manually inject some guesses into the current round
    // Player 1: Correct, took 5s (Multiplier should be 1.75)
    // Player 2: Correct, took 10s (Multiplier should be 1.5), but slower
    game.guesses[1] = {
      [PLAYER_1]: new UserGuess(TRACK_A, 5000),
      [PLAYER_2]: new UserGuess(TRACK_B, 10000)
    };
  });

  it('should calculate points with time multipliers and first-place bonus', () => {
    // Host marks both as correct (Score Value = 1.0)
    game.submitResults({ [PLAYER_1]: 1, [PLAYER_2]: 1 });

    const entry1 = game.leaderboard.getEntry(PLAYER_1);
    const entry2 = game.leaderboard.getEntry(PLAYER_2);

    // Math for Player 1: 
    // Multiplier = 2 - (5000 / 20000) = 1.75
    // Base = 100 * 1.0 * 1.75 = 175
    // First Bonus = 175 * 1.2 = 210
    expect(entry1).toBeDefined();
    expect(entry1!.totalScore).toBe(210);
    expect(entry1!.roundHistory).toHaveLength(1);
    expect(entry1!.roundHistory[0]?.isFirst).toBe(true);
    expect(entry1!.roundHistory[0]?.isCorrect).toBe(true);

    // Math for Player 2:
    // Multiplier = 2 - (10000 / 20000) = 1.5
    // Base = 100 * 1.0 * 1.5 = 150
    // No First Bonus
    expect(entry2).toBeDefined();
    expect(entry2!.totalScore).toBe(150);
    expect(entry2!.roundHistory).toHaveLength(1);
    expect(entry2!.roundHistory[0]?.isFirst).toBe(false);
    expect(entry2!.roundHistory[0]?.isCorrect).toBe(true);
  });

  it('should handle incorrect guesses correctly and assign first bonus to first correct player', () => {
    // Host only marks Player 2 as correct (Score Value = 1.0)
    game.submitResults({ [PLAYER_1]: 0, [PLAYER_2]: 1 });

    const entry1 = game.leaderboard.getEntry(PLAYER_1);
    const entry2 = game.leaderboard.getEntry(PLAYER_2);

    // Zero Points for Player 1
    expect(entry1).toBeDefined();
    expect(entry1!.totalScore).toBe(0);
    expect(entry1!.roundHistory).toHaveLength(1);
    expect(entry1!.roundHistory[0]?.isFirst).toBe(false);
    expect(entry1!.roundHistory[0]?.isCorrect).toBe(false);

    // Math for Player 2:
    // Multiplier = 2 - (10000 / 20000) = 1.5
    // Base = 100 * 1.0 * 1.5 = 150
    // First Bonus = 150 * 1.2 = 180
    expect(entry2).toBeDefined();
    expect(entry2!.totalScore).toBe(180);
    expect(entry2!.roundHistory).toHaveLength(1);
    expect(entry2!.roundHistory[0]?.isFirst).toBe(true);
    expect(entry2!.roundHistory[0]?.isCorrect).toBe(true);
  });

  it('should transition to RESULTS state and reset readyUsers', () => {
    game.readyUsers.add(PLAYER_1);
    
    game.submitResults({});

    expect(game.state).toBe(GameState.RESULTS);
    expect(game.readyUsers.size).toBe(0);
  });
});

describe('GameInstance - advanceRound', () => {
  let game: GameInstance;

  beforeEach(() => {
    game = new GameInstance(HOST);
    game.setupGame(3, 20); // 3 rounds
    game.startGame();

    const entry1 = new LeaderboardEntry(PLAYER_1);
    entry1.totalScore = 500;
    game.leaderboard.addEntry(entry1);
    const entry2 = new LeaderboardEntry(PLAYER_2);
    entry2.totalScore = 1000;
    game.leaderboard.addEntry(entry2);
  });

  it('should move to next round if currentRound < total rounds', () => {
    // We are on round 1 of 3
    const nextState = game.advanceRound();

    expect(nextState).toBe(GameState.TRACK_SELECTION);
    expect(game.currentRound).toBe(2);
    expect(game.state).toBe(GameState.TRACK_SELECTION);
  });

  it('should finish the game and set lastWinnerId when final round is reached', () => {
    // Manually push to the final round (3 of 3)
    game.currentRound = 3;

    const nextState = game.advanceRound();

    expect(nextState).toBe(GameState.GAME_FINISHED);
    expect(game.lastWinnerId).toBe(PLAYER_2);
    expect(game.state).toBe(GameState.GAME_FINISHED);
  });
});

describe('GameInstance - getPartialHint', () => {
  let game: GameInstance;

  beforeEach(() => {
    game = new GameInstance(HOST);
  });

  it('should return a string of underscores and spaces matching the title length', () => {
    game.playTrack("", "Game A", "");
    const hint = game.getPartialHint();

    expect(hint.length).toBe(6);
    expect(hint).toContain('_');
    expect(hint[4]).toBe(' ');
  });
});