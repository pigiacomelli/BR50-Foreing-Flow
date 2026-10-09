/**
 * Utility helpers for date formatting, number formatting, and data manipulation
 */

/**
 * Format a date as YYYY-MM-DD
 */
export function formatDateISO(date) {
  const d = new Date(date);
  return d.toISOString().split('T')[0];
}

/**
 * Format a date for display (DD/MM/YYYY)
 */
export function formatDateBR(date) {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Format a date as short month/year (Jan/2024)
 */
export function formatDateShort(date) {
  const d = new Date(date);
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
                   'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${months[d.getMonth()]}/${d.getFullYear()}`;
}

/**
 * Format number with Brazilian locale
 */
export function formatNumber(num, decimals = 2) {
  if (num == null || isNaN(num)) return '—';
  return num.toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Format number as percentage
 */
export function formatPercent(num, decimals = 2) {
  if (num == null || isNaN(num)) return '—';
  const sign = num >= 0 ? '+' : '';
  return `${sign}${formatNumber(num, decimals)}%`;
}

/**
 * Format number as currency (BRL)
 */
export function formatBRL(num) {
  if (num == null || isNaN(num)) return '—';
  return num.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

/**
 * Get the same date string for comparison between datasets
 * Normalizes date to YYYY-MM-DD to handle timezone differences
 */
export function dateKey(date) {
  return new Date(date).toISOString().slice(0, 10);
}

/**
 * Merge two time series by date (inner join)
 * Only returns dates present in both series
 * @param {Array} marketData - Market data array [{date, close, dailyReturn, ...}]
 * @param {Array} exchangeData - Exchange rate data [{date, value, change, changePercent}]
 * @param {Array} jurosData - DI futuro data [{date, rate}] (optional)
 * @returns {Array} Merged data
 */
export function mergeByDate(marketData, exchangeData, jurosData = []) {
  const exchangeMap = new Map(exchangeData.map(r => [dateKey(r.date), r]));
  const jurosMap = new Map(jurosData.map(r => [dateKey(r.date), r]));
  const marketMap = new Map(marketData.map(r => [dateKey(r.date), r]));
  const merged = [...marketMap.entries()].sort(([a], [b]) => a.localeCompare(b))
    .filter(([key, market]) => Number.isFinite(market.close) && market.close > 0 &&
      Number.isFinite(exchangeMap.get(key)?.value) && exchangeMap.get(key).value > 0)
    .map(([key, market]) => ({
      date: new Date(`${key}T12:00:00Z`), dateStr: key,
      indexClose: market.close, usdBrl: exchangeMap.get(key).value,
      diRate: jurosMap.get(key)?.rate ?? null,
    }));
  // Compute changes AFTER joining: both price returns cover the same interval.
  // DI needs both endpoints; a missing observation never becomes a zero change.
  return merged.map((row, i) => {
    const prev = merged[i - 1];
    return { ...row,
      indexReturn: prev ? (row.indexClose / prev.indexClose - 1) * 100 : null,
      usdBrlChangePercent: prev ? (row.usdBrl / prev.usdBrl - 1) * 100 : null,
      diChangeBps: prev && Number.isFinite(row.diRate) && Number.isFinite(prev.diRate)
        ? (row.diRate - prev.diRate) * 100 : null,
    };
  });
}

/**
 * Calculate simple moving average
 */
export function movingAverage(data, field, window) {
  return data.map((item, i) => {
    if (i < window - 1) return { ...item, [`ma${window}`]: null };
    let sum = 0;
    for (let j = i - window + 1; j <= i; j++) {
      sum += data[j][field];
    }
    return { ...item, [`ma${window}`]: sum / window };
  });
}

/**
 * Delay utility
 */
export function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Chunk an array into smaller arrays
 */
export function chunk(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}
