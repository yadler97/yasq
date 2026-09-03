import type { TrackInfo } from '@yasq/shared';
import type { RoundResult } from './leaderboard.js';

export class GameStats {
  startTime: number | null = null;
  endTime: number | null = null;
  highestStreak: { userId: string; streak: number } | null = null;
  bestScoringRound: { roundResults: RoundResult[]; trackInfo: TrackInfo } | null = null;
  leastScoringRound: { roundResults: RoundResult[]; trackInfo: TrackInfo } | null = null;

  constructor() {}

  public setStartTime(startTime: number) {
    this.startTime = startTime;
  }

  public setEndTime(endTime: number) {
    this.endTime = endTime;
  }

  public getGameDuration() {
    if (this.startTime === null || this.endTime === null) {
      return 0;
    }

    return this.endTime - this.startTime;
  }

  public updateHighestStreak(userId: string, streak: number) {
    if (!this.highestStreak || streak > this.highestStreak.streak) {
      this.highestStreak = { userId, streak };
    }
  }

  public getHighestStreak() {
    return this.highestStreak;
  }

  public updateBestScoringRound(roundResults: RoundResult[], trackInfo: TrackInfo) {
    const totalScore = roundResults.reduce((sum, result) => sum + result.points, 0);
    if (
      !this.bestScoringRound ||
      totalScore > this.bestScoringRound.roundResults.reduce((sum, result) => sum + result.points, 0)
    ) {
      this.bestScoringRound = { roundResults, trackInfo };
    }
  }

  public getBestScoringRound() {
    return this.bestScoringRound;
  }

  public updateLeastScoringRound(roundResults: RoundResult[], trackInfo: TrackInfo) {
    const totalScore = roundResults.reduce((sum, result) => sum + result.points, 0);
    if (
      !this.leastScoringRound ||
      totalScore < this.leastScoringRound.roundResults.reduce((sum, result) => sum + result.points, 0)
    ) {
      this.leastScoringRound = { roundResults, trackInfo };
    }
  }

  public getLeastScoringRound() {
    return this.leastScoringRound;
  }
}
