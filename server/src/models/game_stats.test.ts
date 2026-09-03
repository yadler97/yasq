import { describe, it, expect, beforeEach } from 'vitest';
import { GameStats } from './game_stats.js';
import type { UserRoundResult } from './leaderboard.js';
import type { TrackInfo } from '@yasq/shared';

describe('GameStats', () => {
  let stats: GameStats;
  const mockTrackInfo = {} as TrackInfo;

  beforeEach(() => {
    stats = new GameStats();
  });

  describe('Highest Streak', () => {
    it('should update and retain the highest streak', () => {
      expect(stats.highestStreak).toBeNull();

      stats.updateHighestStreak('user-1', 3);
      expect(stats.highestStreak).toEqual({ userId: 'user-1', streak: 3 });

      // Lower streak should be ignored
      stats.updateHighestStreak('user-2', 2);
      expect(stats.highestStreak).toEqual({ userId: 'user-1', streak: 3 });

      // Higher streak should replace the old one
      stats.updateHighestStreak('user-2', 5);
      expect(stats.highestStreak).toEqual({ userId: 'user-2', streak: 5 });
    });
  });

  describe('Best Scoring Round', () => {
    it('should track the round with the highest total points', () => {
      expect(stats.bestScoringRound).toBeNull();

      const roundA = [{ points: 50 }] as UserRoundResult[];
      const roundB = [{ points: 120 }] as UserRoundResult[];
      const roundC = [{ points: 80 }] as UserRoundResult[];

      stats.updateBestScoringRound(roundA, mockTrackInfo);
      expect(stats.bestScoringRound?.roundResults).toEqual(roundA);

      // Higher score replaces it
      stats.updateBestScoringRound(roundB, mockTrackInfo);
      expect(stats.bestScoringRound?.roundResults).toEqual(roundB);

      // Lower score does not replace the best
      stats.updateBestScoringRound(roundC, mockTrackInfo);
      expect(stats.bestScoringRound?.roundResults).toEqual(roundB);
    });
  });

  describe('Least Scoring Round', () => {
    it('should track the round with the lowest total points', () => {
      expect(stats.leastScoringRound).toBeNull();

      const roundA = [{ points: 50 }] as UserRoundResult[];
      const roundB = [{ points: 10 }] as UserRoundResult[];
      const roundC = [{ points: 30 }] as UserRoundResult[];

      stats.updateLeastScoringRound(roundA, mockTrackInfo);
      expect(stats.leastScoringRound?.roundResults).toEqual(roundA);

      // Lower score replaces it
      stats.updateLeastScoringRound(roundB, mockTrackInfo);
      expect(stats.leastScoringRound?.roundResults).toEqual(roundB);

      // Higher score does not replace the lowest
      stats.updateLeastScoringRound(roundC, mockTrackInfo);
      expect(stats.leastScoringRound?.roundResults).toEqual(roundB);
    });
  });
});
