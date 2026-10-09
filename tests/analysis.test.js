import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeByDate } from '../src/utils/helpers.js';
import { pearsonCorrelation, spearmanCorrelation, runFullAnalysis, rollingCorrelation } from '../src/analysis/statistics.js';
const day = n => new Date(Date.UTC(2026, 8, n, 12));
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} != ${expected}`);

test('aligns returns to common dates, removes duplicates and leaves missing DI changes null', () => {
  const market = [1, 2, 3, 4].map(n => ({ date: day(n), close: 100 + n }));
  const fx = [1, 3, 4].map(n => ({ date: day(n), value: 5 + n / 100 }));
  const di = [{ date: day(1), rate: 13.5 }, { date: day(3), rate: 13.6 }];
  const data = mergeByDate([...market, market[0]], fx, di);
  assert.equal(data.length, 3);
  assert.equal(data[0].indexReturn, null);
  near(data[1].indexReturn, (103 / 101 - 1) * 100);
  near(data[1].usdBrlChangePercent, (5.03 / 5.01 - 1) * 100);
  near(data[1].diChangeBps, 10);
  assert.equal(data[2].diChangeBps, null);
});

test('correlation does not present constant or insufficient samples as zero', () => {
  assert.equal(pearsonCorrelation([1, 1, 1], [1, 2, 3]), null);
  assert.equal(pearsonCorrelation([1, 2], [3, 4]), null);
  near(pearsonCorrelation([1, 2, 3], [3, 2, 1]), -1);
  near(spearmanCorrelation([1, 1, 2, 3], [1, 1, 2, 3]), 1);
});

test('DI analysis uses basis points and excludes missing changes without artificial zeros', () => {
  const data = Array.from({ length: 6 }, (_, i) => ({ date: day(i + 1), indexReturn: i,
    usdBrlChangePercent: -i, diChangeBps: i === 2 ? null : i * 2 }));
  const result = runFullAnalysis(data, 'di-index');
  assert.equal(result.descriptive.dataPoints, 4);
  near(result.pearson, 1); near(result.regression.beta, 0.5);
  assert.equal(runFullAnalysis(data, 'di-usd').pearson, -1);
  assert.equal(result.rolling30.length, 0);
  assert.equal(result.bestLag, null);
  assert.equal(rollingCorrelation([1, null, 3], [1, 2, 3], 3)[0].correlation, null);
});

test('lag zero and Pearson use the same FX direction', () => {
  const data = Array.from({ length: 40 }, (_, i) => ({ date: day(i + 1), indexReturn: -i,
    usdBrlChangePercent: i, diChangeBps: i * 2 }));
  const result = runFullAnalysis(data);
  near(result.pearson, result.lagResults[0].correlation);
});
