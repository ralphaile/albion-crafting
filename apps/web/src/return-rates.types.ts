export interface ReturnRates {
  withoutFocus: number;
  withFocus: number;
}

export interface PlaceReturnRates {
  base: ReturnRates;
  specialty: ReturnRates | undefined;
}
