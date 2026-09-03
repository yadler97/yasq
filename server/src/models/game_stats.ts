import type { TrackInfo } from '@yasq/shared';
import type { UserRoundResult } from './leaderboard.js';

export class GameStats {
  public startTime: number | null = null;
  public endTime: number | null = null;
  public highestStreak: { userId: string; streak: number } | null = null;
  public bestScoringRound: { roundResults: UserRoundResult[]; trackInfo: TrackInfo } | null = null;
  public leastScoringRound: { roundResults: UserRoundResult[]; trackInfo: TrackInfo } | null = null;

  constructor() {}

  public updateHighestStreak(userId: string, streak: number) {
    if (!this.highestStreak || streak > this.highestStreak.streak) {
      this.highestStreak = { userId, streak };
    }
  }

  public updateBestScoringRound(roundResults: UserRoundResult[], trackInfo: TrackInfo) {
    const totalScore = roundResults.reduce((sum, result) => sum + (result.points || 0), 0);
    if (
      !this.bestScoringRound ||
      totalScore > this.bestScoringRound.roundResults.reduce((sum, result) => sum + (result.points || 0), 0)
    ) {
      this.bestScoringRound = { roundResults, trackInfo };
    }
  }

  public updateLeastScoringRound(roundResults: UserRoundResult[], trackInfo: TrackInfo) {
    const totalScore = roundResults.reduce((sum, result) => sum + (result.points || 0), 0);
    if (
      !this.leastScoringRound ||
      totalScore < this.leastScoringRound.roundResults.reduce((sum, result) => sum + (result.points || 0), 0)
    ) {
      this.leastScoringRound = { roundResults, trackInfo };
    }
  }
}
