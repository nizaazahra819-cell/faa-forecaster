export declare const MARKETS: {
    id: string;
    label: string;
}[];
export declare const QUANTILES: number[];
export interface MarketHistory {
    id: string;
    prices: number[];
}
export interface CaseInput {
    markets: MarketHistory[];
    checkpoint_minutes: number;
}
export interface Forecast {
    market: string;
    quantiles: number[];
}
export interface ForecastOutput {
    [marketId: string]: Forecast;
}
export declare function forecastPrice(marketHistories: MarketHistory[], steps?: number): ForecastOutput;
//# sourceMappingURL=index.d.ts.map