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
  return `${sign}${num.toFixed(decimals)}%`;
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
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Merge two time series by date (inner join)
 * Only returns dates present in both series
 * @param {Array} marketData - Market data array [{date, close, dailyReturn, ...}]
 * @param {Array} exchangeData - Exchange rate data [{date, value, change, changePercent}]
 * @param {Array} jurosData - Juros Futuros proxy data [{date, close}] (optional)
 * @returns {Array} Merged data
 */
export function mergeByDate(marketData, exchangeData, jurosData = []) {
  // Create lookup from exchange data
  const exchangeMap = new Map();
  for (const item of exchangeData) {
    exchangeMap.set(dateKey(item.date), item);
  }
  // Create lookup from juros data
  const jurosMap = new Map();
  for (const item of jurosData) {
    jurosMap.set(dateKey(item.date), item);
  }

  const merged = [];
  for (const market of marketData) {
    const key = dateKey(market.date);
    const exchange = exchangeMap.get(key);
    
    // We only strictly require market and exchange. Juros can be null for a day.
    if (exchange) {
      const juros = jurosMap.get(key);
      merged.push({
        date: market.date,
        dateStr: key,
        // Market data
        indexClose: market.close,
        indexReturn: market.dailyReturn || 0,
        indexOpen: market.open,
        indexHigh: market.high,
        indexLow: market.low,
        indexVolume: market.volume,
        // Exchange rate data
        usdBrl: exchange.value,
        usdBrlChange: exchange.change || 0,
        usdBrlChangePercent: exchange.changePercent || 0,
        // Dollar flow proxy (inverted: positive = inflow/BRL strengthening)
        dollarFlowProxy: -(exchange.changePercent || 0),
        // Juros Futuros proxy (IRFM11)
        jurosClose: juros ? juros.close : null,
      });
    }
  }

  return merged.sort((a, b) => a.date - b.date);
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
