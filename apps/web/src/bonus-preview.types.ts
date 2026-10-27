export interface BonusRow {
  bonus: number;
  bonusWithFocus: number;
  returnRate: number;
  returnRateWithFocus: number;
}

export interface BonusPreview {
  base: BonusRow;
  specialty: BonusRow | undefined;
}
