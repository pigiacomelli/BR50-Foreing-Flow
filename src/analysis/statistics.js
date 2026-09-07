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
  if (n < 3) return 0;

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
  if (denom === 0) return 0;
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
  if (n < 3) return 0;

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
  const results = [];

  for (let lag = 0; lag <= maxLag; lag++) {
    const xSlice = x.slice(0, x.length - lag);
    const ySlice = y.slice(lag);
    const n = Math.min(xSlice.length, ySlice.length);

    if (n < 10) {
      results.push({ lag, correlation: 0 });
      continue;
    }

    const corr = pearsonCorrelation(xSlice.slice(0, n), ySlice.slice(0, n));
    results.push({ lag, correlation: corr });
  }

  return results;
}

/**
 * Calculate rolling (windowed) correlation
 * @param {number[]} x - First array
 * @param {number[]} y - Second array
 * @param {number} window - Window size
 * @returns {Array<{index: number, correlation: number}>}
 */
export function rollingCorrelation(x, y, window) {
  const results = [];
  const n = Math.min(x.length, y.length);

  for (let i = window - 1; i < n; i++) {
    const xWindow = x.slice(i - window + 1, i + 1);
    const yWindow = y.slice(i - window + 1, i + 1);
    const corr = pearsonCorrelation(xWindow, yWindow);
    results.push({ index: i, correlation: corr });
  }

  return results;
}

/**
 * Run complete statistical analysis on merged data
 * @param {Array} mergedData - Merged market + exchange data
 * @returns {Object} Statistical results
 */
export function runFullAnalysis(mergedData) {
  // Extract arrays for analysis
  const indexReturns = mergedData.map(d => d.indexReturn);
  const usdBrlChanges = mergedData.map(d => d.usdBrlChangePercent);
  const dollarFlow = mergedData.map(d => d.dollarFlowProxy);

  // Skip first element (no return for first day)
  const returns = indexReturns.slice(1);
  const changes = usdBrlChanges.slice(1);
  const flow = dollarFlow.slice(1);

  // 1. Pearson correlation
  const pearson = pearsonCorrelation(changes, returns);

  // 2. Spearman correlation
  const spearman = spearmanCorrelation(changes, returns);

  // 3. Linear regression: indexReturn = alpha + beta * usdBrlChange
  const regression = linearRegression(changes, returns);

  // 4. Lag correlation (does dollar flow predict returns?)
  const lagResults = lagCorrelation(flow, returns, 10);
  
  // Find best lag
  const bestLag = lagResults.reduce((best, curr) => 
    Math.abs(curr.correlation) > Math.abs(best.correlation) ? curr : best,
    lagResults[0]
  );

  // 5. Rolling correlations
  const rolling30 = rollingCorrelation(changes, returns, 30);
  const rolling60 = rollingCorrelation(changes, returns, 60);
  const rolling90 = rollingCorrelation(changes, returns, 90);

  // 6. Basic descriptive stats
  const stats = {
    indexReturnMean: mean(returns),
    indexReturnStd: stddev(returns),
    usdChangeReturnMean: mean(changes),
    usdChangetd: stddev(changes),
    dataPoints: returns.length,
  };

  return {
    pearson,
    spearman,
    regression,
    lagResults,
    bestLag,
    rolling30,
    rolling60,
    rolling90,
    descriptive: stats,
    // Raw arrays for chart rendering
    rawReturns: returns,
    rawChanges: changes,
    rawFlow: flow,
  };
}
