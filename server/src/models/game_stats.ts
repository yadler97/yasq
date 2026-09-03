import type { UserRoundResult } from './leaderboard.js';
import type { Track } from '@yasq/shared';

export class GameStats {
  public startTime: number | null = null;
  public endTime: number | null = null;
  public highestStreak: { userId: string; streak: number } | null = null;
  public bestScoringRound: { roundResults: UserRoundResult[]; track: Track } | null = null;
  public leastScoringRound: { roundResults: UserRoundResult[]; track: Track } | null = null;

  constructor() {}

  public updateHighestStreak(userId: string, streak: number) {
    if (!this.highestStreak || streak > this.highestStreak.streak) {
      this.highestStreak = { userId, streak };
    }
  }

  public updateBestScoringRound(roundResults: UserRoundResult[], track: Track) {
    const totalScore = roundResults.reduce((sum, result) => sum + (result.points || 0), 0);
    if (
      !this.bestScoringRound ||
      totalScore > this.bestScoringRound.roundResults.reduce((sum, result) => sum + (result.points || 0), 0)
    ) {
      this.bestScoringRound = { roundResults, track };
    }
  }

  public updateLeastScoringRound(roundResults: UserRoundResult[], track: Track) {
    const totalScore = roundResults.reduce((sum, result) => sum + (result.points || 0), 0);
    if (
      !this.leastScoringRound ||
      totalScore < this.leastScoringRound.roundResults.reduce((sum, result) => sum + (result.points || 0), 0)
    ) {
      this.leastScoringRound = { roundResults, track };
    }
  }
}
