import type { UserRoundResult } from './leaderboard.js';
import { BASE_POINTS, BonusType, type Track } from '@yasq/shared';

export class GameStats {
  public startTime: number | null = null;
  public endTime: number | null = null;
  public highestStreak: { userIds: string[]; streak: number } | null = null;
  public bestScoringRound: { roundResults: UserRoundResult[]; track: Track; timeBonusSum: number } | null = null;
  public leastScoringRound: { roundResults: UserRoundResult[]; track: Track; timeBonusSum: number } | null = null;
  public fastestCorrectGuess: { roundResults: UserRoundResult; track: Track } | null = null;

  constructor() {}

  public updateHighestStreak(userId: string, streak: number) {
    if (!this.highestStreak) {
      this.highestStreak = { userIds: [userId], streak };
    } else if (streak > this.highestStreak.streak) {
      // New high score beats the old one
      this.highestStreak = { userIds: [userId], streak };
    } else if (streak === this.highestStreak.streak) {
      // Tie found: add user to the list if they aren't already there
      if (!this.highestStreak.userIds.includes(userId)) {
        this.highestStreak.userIds.push(userId);
      }
    }
  }

  private calculateTimeBonusSum(roundResults: UserRoundResult[]): number {
    return roundResults.reduce((sum, result) => {
      const timeBonus = result.awardedBonuses?.find(b => b.type === BonusType.TIME_BONUS);
      if (!timeBonus) return sum;

      const basePoints = BASE_POINTS * result.scoreValue;
      return sum + timeBonus.toAbsolute(basePoints);
    }, 0);
  }

  public updateBestScoringRound(roundResults: UserRoundResult[], track: Track) {
    const totalTimeBonus = this.calculateTimeBonusSum(roundResults);
    const currentBest = this.bestScoringRound ? this.calculateTimeBonusSum(this.bestScoringRound.roundResults) : 0;

    if (!this.bestScoringRound || totalTimeBonus > currentBest) {
      this.bestScoringRound = { roundResults, track, timeBonusSum: totalTimeBonus };
    }
  }

  public updateLeastScoringRound(roundResults: UserRoundResult[], track: Track) {
    const totalTimeBonus = this.calculateTimeBonusSum(roundResults);
    const currentLeast = this.leastScoringRound
      ? this.calculateTimeBonusSum(this.leastScoringRound.roundResults)
      : Infinity;

    if (!this.leastScoringRound || totalTimeBonus < currentLeast) {
      this.leastScoringRound = { roundResults, track, timeBonusSum: totalTimeBonus };
    }
  }

  public updateFastestCorrectGuess(roundResults: UserRoundResult[], track: Track) {
    const correctGuesses = roundResults.filter(result => result.scoreValue === 1);
    if (correctGuesses.length === 0) return;

    const fastestGuess = correctGuesses.reduce((fastest, current) => {
      if (!fastest.time || !current.time) return fastest;
      return current.time < fastest.time ? current : fastest;
    });

    if (
      !this.fastestCorrectGuess ||
      (fastestGuess.time && fastestGuess.time < this.fastestCorrectGuess.roundResults.time!)
    ) {
      this.fastestCorrectGuess = { roundResults: fastestGuess, track };
    }
  }
}
