import { describe, it, expect, beforeEach } from 'vitest';
import { GameStats } from './game_stats.js';
import type { RoundResult } from './leaderboard.js';
import type { TrackInfo } from '@yasq/shared';

describe('GameStats', () => {
  let stats: GameStats;
  const mockTrackInfo = {} as TrackInfo;

  beforeEach(() => {
    stats = new GameStats();
  });

  describe('Game Duration', () => {
    it('should return 0 if start or end time is missing', () => {
      expect(stats.getGameDuration()).toBe(0);

      stats.setStartTime(1000);
      expect(stats.getGameDuration()).toBe(0);
    });

    it('should calculate the total game duration correctly', () => {
      stats.setStartTime(1000);
      stats.setEndTime(6000);
      expect(stats.getGameDuration()).toBe(5000);
    });
  });

  describe('Highest Streak', () => {
    it('should update and retain the highest streak', () => {
      expect(stats.getHighestStreak()).toBeNull();

      stats.updateHighestStreak('user-1', 3);
      expect(stats.getHighestStreak()).toEqual({ userId: 'user-1', streak: 3 });

      // Lower streak should be ignored
      stats.updateHighestStreak('user-2', 2);
      expect(stats.getHighestStreak()).toEqual({ userId: 'user-1', streak: 3 });

      // Higher streak should replace the old one
      stats.updateHighestStreak('user-2', 5);
      expect(stats.getHighestStreak()).toEqual({ userId: 'user-2', streak: 5 });
    });
  });

  describe('Best Scoring Round', () => {
    it('should track the round with the highest total points', () => {
      expect(stats.getBestScoringRound()).toBeNull();

      const roundA = [{ points: 50 }] as RoundResult[];
      const roundB = [{ points: 120 }] as RoundResult[];
      const roundC = [{ points: 80 }] as RoundResult[];

      stats.updateBestScoringRound(roundA, mockTrackInfo);
      expect(stats.getBestScoringRound()?.roundResults).toEqual(roundA);

      // Higher score replaces it
      stats.updateBestScoringRound(roundB, mockTrackInfo);
      expect(stats.getBestScoringRound()?.roundResults).toEqual(roundB);

      // Lower score does not replace the best
      stats.updateBestScoringRound(roundC, mockTrackInfo);
      expect(stats.getBestScoringRound()?.roundResults).toEqual(roundB);
    });
  });

  describe('Least Scoring Round', () => {
    it('should track the round with the lowest total points', () => {
      expect(stats.getLeastScoringRound()).toBeNull();

      const roundA = [{ points: 50 }] as RoundResult[];
      const roundB = [{ points: 10 }] as RoundResult[];
      const roundC = [{ points: 30 }] as RoundResult[];

      stats.updateLeastScoringRound(roundA, mockTrackInfo);
      expect(stats.getLeastScoringRound()?.roundResults).toEqual(roundA);

      // Lower score replaces it
      stats.updateLeastScoringRound(roundB, mockTrackInfo);
      expect(stats.getLeastScoringRound()?.roundResults).toEqual(roundB);

      // Higher score does not replace the lowest
      stats.updateLeastScoringRound(roundC, mockTrackInfo);
      expect(stats.getLeastScoringRound()?.roundResults).toEqual(roundB);
    });
  });
});
