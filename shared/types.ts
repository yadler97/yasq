import {
  DEFAULT_FIRST_BONUS_MULTIPLIER,
  DEFAULT_ROUNDS,
  DEFAULT_STREAK_BONUS_MULTIPLIER,
  DEFAULT_TIME_BONUS,
  DEFAULT_TRACK_DURATION,
  FirstBonusMultiplier,
  Joker,
  StreakBonusMultiplier,
  TimeBonus
} from "@yasq/shared";

export class GameSettings<T = Joker[]> {
  constructor(
    public rounds: number = DEFAULT_ROUNDS,
    public trackDuration: number = DEFAULT_TRACK_DURATION,
    public enabledJokers: T = [] as T,
    public firstBonusMultiplier: FirstBonusMultiplier = DEFAULT_FIRST_BONUS_MULTIPLIER,
    public timeBonus: TimeBonus | null = DEFAULT_TIME_BONUS,
    public streakBonusMultiplier: StreakBonusMultiplier = DEFAULT_STREAK_BONUS_MULTIPLIER,
  ) {}
}