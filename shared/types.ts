import { FirstBonusMultiplier, Joker } from "@yasq/shared";

export interface GameSettings<T = Joker[]> {
  rounds: number;
  trackDuration: number;
  enabledJokers: T;
  firstBonusMultiplier: FirstBonusMultiplier;
}