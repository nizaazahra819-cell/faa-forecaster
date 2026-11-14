// FAA Forecaster - Predicts 5 quantiles (5%, 25%, 50%, 75%, 95%)
// for each of 4 FAA attribution markets for next 240 minutes

import fs from 'fs';
import { performance } from 'perf_hooks';

// Market identifiers (Polymarket's FAA attribution markets)
export const MARKETS = [
  { id: 'iran', label: 'Iran' },
  { id: 'foreign_actor', label: 'Foreign Actor' },
  { id: 'hack', label: 'Hack' },
  { id: 'ai_sandbox_escape', label: 'AI Sandbox Escape' },
];

// Quantile levels (5%, 25%, 50%, 75%, 95%)
export const QUANTILES = [0.05, 0.25, 0.5, 0.75, 0.95];

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

function calculateVolatility(prices: number[]): number {
  if (prices.length < 2) return 0;
  let sum = 0;
  for (let i = 1; i < prices.length; i++) {
    const prev = prices[i - 1];
    if (prev === undefined) continue;
    const curr = prices[i];
    if (curr === undefined) continue;
    const ret = (curr - prev) / prev;
    sum += ret * ret;
  }
  const meanSquare = sum / prices.length;
  return Math.sqrt(meanSquare) * Math.sqrt(24 * 60);
}

// Calculate mean of an array
function mean(values: number[]): number {
  if (values.length === 0) return 0;
  let sum = 0;
  for (const v of values) {
    sum += v;
  }
  return sum / values.length;
}

// Bootstrap quantile prediction
function bootstrapQuantiles(
  prices: number[],
  quantiles: number[],
  steps: number,
  nIterations: number = 100
): number[] {
  const n = prices.length;
  const predictions: number[] = [];

  for (let s = 0; s < steps; s++) {
    const quantileValues: number[] = [];

    for (let iter = 0; iter < nIterations; iter++) {
      const sample: number[] = [];
      for (let i = 0; i < n; i++) {
        const idx = Math.floor(Math.random() * n);
        const val = prices[idx];
        if (val === undefined) continue;
        sample.push(val);
      }

      const center = sample.slice(-5);
      const nextValue = mean(center);
      const entropy = Math.random();
      const noise = (entropy - 0.5) * 0.04;
      quantileValues.push(nextValue + noise);
    }

    const sorted = quantileValues.sort((a, b) => a - b);
    const stepQuantiles: number[] = [];
    for (const q of quantiles) {
      const idx = (sorted.length - 1) * q;
      const lower = Math.floor(idx);
      const upper = Math.ceil(idx);
      const lowerVal = sorted[lower];
      const upperVal = sorted[upper];
      if (lowerVal === undefined || upperVal === undefined) continue;
      const fraction = idx - lower;
      const value = lowerVal + (upperVal - lowerVal) * fraction;
      stepQuantiles.push(value);
    }
    predictions.push(...stepQuantiles);
  }

  return predictions;
}

// Main forecast function
export function forecastPrice(
  marketHistories: MarketHistory[],
  steps: number = 240
): ForecastOutput {
  const output: ForecastOutput = {};

  for (const market of marketHistories) {
    const prices = market.prices;

    // Bootstrap prediction for each quantile
    const bootstrapResult = bootstrapQuantiles(
      prices,
      QUANTILES,
      steps,
      50
    );

    output[market.id] = {
      market: market.id,
      quantiles: bootstrapResult,
    };
  }

  return output;
}

// CLI interface
function main() {
  const input = process.argv[2] || 'case.json';
  let caseData: CaseInput;

  try {
    const content = fs.readFileSync(input, 'utf-8');
    caseData = JSON.parse(content);
  } catch (e: unknown) {
    console.error('Error reading case file:', (e as Error).message);
    process.exit(1);
  }

  const result = forecastPrice(caseData.markets, 240);
  console.log(JSON.stringify(result, null, 2));
}

main();
