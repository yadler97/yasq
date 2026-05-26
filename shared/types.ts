import { DEFAULT_FIRST_BONUS_MULTIPLIER, DEFAULT_ROUNDS, DEFAULT_TRACK_DURATION, FirstBonusMultiplier, Joker } from "@yasq/shared";

export class GameSettings<T = Joker[]> {
  constructor(
    public rounds: number = DEFAULT_ROUNDS,
    public trackDuration: number = DEFAULT_TRACK_DURATION,
    public enabledJokers: T = [] as T,
    public firstBonusMultiplier: FirstBonusMultiplier = DEFAULT_FIRST_BONUS_MULTIPLIER
  ) {}
}