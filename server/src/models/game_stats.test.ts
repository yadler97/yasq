import { beforeEach, describe, expect, it } from 'vitest';

import { GameStats } from './game_stats.js';
import type { UserRoundResult } from './leaderboard.js';
import { BonusType, PointsBonus, type Track } from '@yasq/shared';

describe('GameStats', () => {
  let stats: GameStats;
  const mockTrack = {} as Track;

  beforeEach(() => {
    stats = new GameStats();
  });

  describe('Highest Streak', () => {
    it('should update, retain, and handle ties for the highest streak', () => {
      expect(stats.highestStreak).toBeNull();

      stats.updateHighestStreak('user-1', 3);
      expect(stats.highestStreak).toEqual({ userIds: ['user-1'], streak: 3 });

      // Lower streak should be ignored
      stats.updateHighestStreak('user-2', 2);
      expect(stats.highestStreak).toEqual({ userIds: ['user-1'], streak: 3 });

      // Equal streak should add to the userIds array (tie)
      stats.updateHighestStreak('user-2', 3);
      expect(stats.highestStreak).toEqual({ userIds: ['user-1', 'user-2'], streak: 3 });

      // Higher streak should replace the old ones entirely
      stats.updateHighestStreak('user-3', 5);
      expect(stats.highestStreak).toEqual({ userIds: ['user-3'], streak: 5 });
    });
  });

  describe('Best Scoring Round', () => {
    it('should track the round with the highest combined time bonus', () => {
      expect(stats.bestScoringRound).toBeNull();

      const roundA = [
        { userId: 'user-1', scoreValue: 1, awardedBonuses: [new PointsBonus(BonusType.TIME_BONUS, 0.5)] },
        { userId: 'user-2', scoreValue: 0.5, awardedBonuses: [new PointsBonus(BonusType.TIME_BONUS, 0.3)] },
      ] as UserRoundResult[];
      const roundB = [
        { userId: 'user-1', scoreValue: 1, awardedBonuses: [new PointsBonus(BonusType.TIME_BONUS, 0.9)] },
        { userId: 'user-2', scoreValue: 1, awardedBonuses: [new PointsBonus(BonusType.TIME_BONUS, 0.4)] },
      ] as UserRoundResult[];
      const roundC = [
        { userId: 'user-1', scoreValue: 1, awardedBonuses: [new PointsBonus(BonusType.TIME_BONUS, 0.7)] },
        { userId: 'user-2', scoreValue: 0, awardedBonuses: [] },
      ] as UserRoundResult[];

      stats.updateBestScoringRound(roundA, mockTrack);
      expect(stats.bestScoringRound?.roundResults).toEqual(roundA);
      expect(stats.bestScoringRound?.timeBonusSum).toBe(65); // 50 + 15

      // Higher combined time bonus replaces it
      stats.updateBestScoringRound(roundB, mockTrack);
      expect(stats.bestScoringRound?.roundResults).toEqual(roundB);
      expect(stats.bestScoringRound?.timeBonusSum).toBe(130); // 90 + 40

      // Lower combined time bonus does not replace the best
      stats.updateBestScoringRound(roundC, mockTrack);
      expect(stats.bestScoringRound?.roundResults).toEqual(roundB);
    });
  });

  describe('Least Scoring Round', () => {
    it('should track the round with the lowest combined time bonus', () => {
      expect(stats.leastScoringRound).toBeNull();

      const roundA = [
        { userId: 'user-1', scoreValue: 1, awardedBonuses: [new PointsBonus(BonusType.TIME_BONUS, 0.9)] },
        { userId: 'user-2', scoreValue: 1, awardedBonuses: [new PointsBonus(BonusType.TIME_BONUS, 0.4)] },
      ] as UserRoundResult[];
      const roundB = [
        { userId: 'user-1', scoreValue: 1, awardedBonuses: [new PointsBonus(BonusType.TIME_BONUS, 0.5)] },
        { userId: 'user-2', scoreValue: 0.5, awardedBonuses: [new PointsBonus(BonusType.TIME_BONUS, 0.3)] },
      ] as UserRoundResult[];
      const roundC = [
        { userId: 'user-1', scoreValue: 1, awardedBonuses: [new PointsBonus(BonusType.TIME_BONUS, 0.7)] },
        { userId: 'user-2', scoreValue: 0, awardedBonuses: [] },
      ] as UserRoundResult[];

      stats.updateLeastScoringRound(roundA, mockTrack);
      expect(stats.leastScoringRound?.roundResults).toEqual(roundA);
      expect(stats.leastScoringRound?.timeBonusSum).toBe(130); // 90 + 40

      // Lower combined time bonus replaces it
      stats.updateLeastScoringRound(roundB, mockTrack);
      expect(stats.leastScoringRound?.roundResults).toEqual(roundB);
      expect(stats.leastScoringRound?.timeBonusSum).toBe(65); // 50 + 15

      // Higher combined time bonus does not replace the lowest
      stats.updateLeastScoringRound(roundC, mockTrack);
      expect(stats.leastScoringRound?.roundResults).toEqual(roundB);
    });
  });

  describe('Fastest Correct Guess', () => {
    it('should track the fully correct guess with the lowest time', () => {
      expect(stats.fastestCorrectGuess).toBeNull();

      const roundA = [
        { userId: 'user-1', scoreValue: 0.5, time: '1.0' }, // Ignored because scoreValue is not 1
        { userId: 'user-2', scoreValue: 1, time: '3.5' },
        { userId: 'user-3', scoreValue: 1, time: '2.1' },
      ] as UserRoundResult[];

      const roundB = [
        { userId: 'user-1', scoreValue: 1, time: '1.5' },
        { userId: 'user-2', scoreValue: 0, time: '0.5' }, // Ignored because scoreValue is not 1
        { userId: 'user-3', scoreValue: 1, time: '5.3' },
      ] as UserRoundResult[];

      const roundC = [
        { userId: 'user-1', scoreValue: 1, time: '4.0' },
        { userId: 'user-2', scoreValue: 1, time: '7.7' },
        { userId: 'user-3', scoreValue: 1, time: '6.4' },
      ] as UserRoundResult[];

      stats.updateFastestCorrectGuess(roundA, mockTrack);
      expect(stats.fastestCorrectGuess?.roundResults).toEqual(roundA[2]);

      // Faster fully correct guess replaces it
      stats.updateFastestCorrectGuess(roundB, mockTrack);
      expect(stats.fastestCorrectGuess?.roundResults).toEqual(roundB[0]);

      // Slower guess does not replace the fastest
      stats.updateFastestCorrectGuess(roundC, mockTrack);
      expect(stats.fastestCorrectGuess?.roundResults).toEqual(roundB[0]);
    });
  });
});
