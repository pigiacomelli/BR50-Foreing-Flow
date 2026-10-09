/**
 * Statistical analysis module
 * Implements correlation, regression, and other statistical measures
 */

/**
 * Calculate mean of an array
 */
export function mean(arr) {
  if (arr.length === 0) return 0;
  return arr.reduce((sum, v) => sum + v, 0) / arr.length;
}

/**
 * Calculate standard deviation
 */
export function stddev(arr) {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  const variance = arr.reduce((sum, v) => sum + (v - m) ** 2, 0) / (arr.length - 1);
  return Math.sqrt(variance);
}

/**
 * Pearson correlation coefficient
 * @param {number[]} x - First array
 * @param {number[]} y - Second array
 * @returns {number} Correlation coefficient (-1 to 1)
 */
export function pearsonCorrelation(x, y) {
  const n = Math.min(x.length, y.length);
  if (n < 3) return null;

  const mx = mean(x.slice(0, n));
  const my = mean(y.slice(0, n));

  let sumXY = 0, sumX2 = 0, sumY2 = 0;
  for (let i = 0; i < n; i++) {
    const dx = x[i] - mx;
    const dy = y[i] - my;
    sumXY += dx * dy;
    sumX2 += dx * dx;
    sumY2 += dy * dy;
  }

  const denom = Math.sqrt(sumX2 * sumY2);
  if (denom === 0) return null;
  return sumXY / denom;
}

/**
 * Spearman rank correlation coefficient
 * @param {number[]} x - First array
 * @param {number[]} y - Second array
 * @returns {number} Rank correlation coefficient (-1 to 1)
 */
export function spearmanCorrelation(x, y) {
  const n = Math.min(x.length, y.length);
  if (n < 3) return null;

  const rankX = calculateRanks(x.slice(0, n));
  const rankY = calculateRanks(y.slice(0, n));

  return pearsonCorrelation(rankX, rankY);
}

/**
 * Calculate ranks for an array (handling ties with average rank)
 */
function calculateRanks(arr) {
  const indexed = arr.map((v, i) => ({ value: v, index: i }));
  indexed.sort((a, b) => a.value - b.value);

  const ranks = new Array(arr.length);
  let i = 0;
  while (i < indexed.length) {
    let j = i;
    // Find all tied values
    while (j < indexed.length && indexed[j].value === indexed[i].value) {
      j++;
    }
    // Average rank for ties
    const avgRank = (i + j - 1) / 2 + 1;
    for (let k = i; k < j; k++) {
      ranks[indexed[k].index] = avgRank;
    }
    i = j;
  }

  return ranks;
}

/**
 * Simple linear regression: y = alpha + beta * x
 * @param {number[]} x - Independent variable
 * @param {number[]} y - Dependent variable
 * @returns {{alpha: number, beta: number, rSquared: number, predictions: number[]}}
 */
export function linearRegression(x, y) {
  const n = Math.min(x.length, y.length);
  if (n < 3) return { alpha: 0, beta: 0, rSquared: 0, predictions: [] };

  const mx = mean(x.slice(0, n));
  const my = mean(y.slice(0, n));

  let sumXY = 0, sumX2 = 0, sumY2 = 0;
  for (let i = 0; i < n; i++) {
    const dx = x[i] - mx;
    const dy = y[i] - my;
    sumXY += dx * dy;
    sumX2 += dx * dx;
    sumY2 += dy * dy;
  }

  const beta = sumX2 === 0 ? 0 : sumXY / sumX2;
  const alpha = my - beta * mx;

  // R-squared
  const ssRes = x.slice(0, n).reduce((sum, xi, i) => {
    const pred = alpha + beta * xi;
    return sum + (y[i] - pred) ** 2;
  }, 0);
  const ssTot = sumY2;
  const rSquared = ssTot === 0 ? 0 : 1 - ssRes / ssTot;

  // Predictions
  const predictions = x.slice(0, n).map(xi => alpha + beta * xi);

  return { alpha, beta, rSquared: Math.max(0, rSquared), predictions };
}

/**
 * Calculate correlation with lag
 * Tests if changes in x at time t-lag predict changes in y at time t
 * @param {number[]} x - Leading variable (e.g., dollar flow)
 * @param {number[]} y - Lagging variable (e.g., index returns)
 * @param {number} maxLag - Maximum lag to test (in days)
 * @returns {Array<{lag: number, correlation: number}>}
 */
export function lagCorrelation(x, y, maxLag = 10) {
  return Array.from({ length: maxLag + 1 }, (_, lag) => {
    const pairs = x.slice(0, x.length - lag).map((value, i) => [value, y[i + lag]])
      .filter(([a, b]) => Number.isFinite(a) && Number.isFinite(b));
    return { lag, count: pairs.length, correlation: pairs.length >= 10
      ? pearsonCorrelation(pairs.map(p => p[0]), pairs.map(p => p[1])) : null };
  });
}

export function rollingCorrelation(x, y, window) {
  const results = [];
  for (let i = window - 1; i < Math.min(x.length, y.length); i++) {
    const a = x.slice(i - window + 1, i + 1), b = y.slice(i - window + 1, i + 1);
    results.push({ index: i, correlation: a.every(Number.isFinite) && b.every(Number.isFinite)
      ? pearsonCorrelation(a, b) : null });
  }
  return results;
}

export const ANALYSIS_PAIRS = {
  'usd-index': { x: 'usdBrlChangePercent', y: 'indexReturn', xLabel: 'Variação USD/BRL (%)', yLabel: 'Retorno IBrX-50 (%)', xUnit: '%', yUnit: '%' },
  'di-index': { x: 'diChangeBps', y: 'indexReturn', xLabel: 'Variação DI futuro (pb)', yLabel: 'Retorno IBrX-50 (%)', xUnit: 'pb', yUnit: '%' },
  'di-usd': { x: 'diChangeBps', y: 'usdBrlChangePercent', xLabel: 'Variação DI futuro (pb)', yLabel: 'Variação USD/BRL (%)', xUnit: 'pb', yUnit: '%' },
};

export function runFullAnalysis(mergedData, pair = 'usd-index') {
  const config = ANALYSIS_PAIRS[pair];
  const grid = mergedData.slice(1);
  const samples = grid.filter(d => Number.isFinite(d[config.x]) && Number.isFinite(d[config.y]));
  const changes = samples.map(d => d[config.x]), returns = samples.map(d => d[config.y]);
  const x = grid.map(d => d[config.x]), y = grid.map(d => d[config.y]);
  const pearson = pearsonCorrelation(changes, returns);
  const regression = pearson === null ? { alpha: null, beta: null, rSquared: null, predictions: [] }
    : linearRegression(changes, returns);
  const lagResults = lagCorrelation(x, y, 10);
  const bestLag = lagResults.filter(r => r.lag > 0 && r.correlation !== null).reduce((best, r) =>
    !best || Math.abs(r.correlation) > Math.abs(best.correlation) ? r : best, null);
  return { ...config, pearson, spearman: spearmanCorrelation(changes, returns), regression,
    lagResults, bestLag, rolling30: rollingCorrelation(x, y, 30),
    rolling60: rollingCorrelation(x, y, 60), rolling90: rollingCorrelation(x, y, 90),
    dates: grid.map(d => d.date), sampleStart: samples[0]?.date, sampleEnd: samples.at(-1)?.date,
    descriptive: { dataPoints: samples.length }, rawChanges: changes, rawReturns: returns };
}
