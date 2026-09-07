/**
 * Yahoo Finance API Client
 * Fetches historical market data for Brazilian indices
 * Uses Vite dev server proxy to avoid CORS issues
 */

// In dev mode, requests go through Vite proxy (/api/yahoo -> query1.finance.yahoo.com)
const YAHOO_PROXY_PATH = '/api/yahoo/v8/finance/chart';

// Tickers to try for IBrX-50 (in order of preference)
const IBRX50_TICKERS = [
  { symbol: '^IBX50', name: 'IBrX-50' },
  { symbol: '^BVSP', name: 'Ibovespa (proxy IBrX-50)' },
];

/**
 * Convert date string to Unix timestamp
 */
function dateToUnix(dateStr) {
  return Math.floor(new Date(dateStr).getTime() / 1000);
}

/**
 * Parse Yahoo Finance chart API response
 */
function parseYahooResponse(data) {
  const result = data.chart?.result?.[0];
  if (!result) {
    throw new Error('Invalid Yahoo Finance response structure');
  }

  const timestamps = result.timestamp;
  const quotes = result.indicators?.quote?.[0];

  if (!timestamps || !quotes) {
    throw new Error('No price data in response');
  }

  const parsed = [];
  for (let i = 0; i < timestamps.length; i++) {
    const close = quotes.close?.[i];
    const open = quotes.open?.[i];
    const high = quotes.high?.[i];
    const low = quotes.low?.[i];
    const volume = quotes.volume?.[i];

    // Skip entries with null values
    if (close == null) continue;

    parsed.push({
      date: new Date(timestamps[i] * 1000),
      open: open ?? close,
      high: high ?? close,
      low: low ?? close,
      close,
      volume: volume ?? 0,
    });
  }

  return parsed;
}

/**
 * Fetch market data from Yahoo Finance via Vite proxy
 * Tries multiple tickers for IBrX-50 with fallback to Ibovespa
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @returns {Promise<{data: Array, tickerInfo: {symbol: string, name: string}}>}
 */
export async function fetchMarketData(startDate, endDate) {
  const period1 = dateToUnix(startDate);
  const period2 = dateToUnix(endDate);

  for (const ticker of IBRX50_TICKERS) {
    try {
      console.log(`Trying ticker: ${ticker.symbol} (${ticker.name})...`);

      // Use local proxy path — Vite rewrites to Yahoo Finance
      const url = `${YAHOO_PROXY_PATH}/${encodeURIComponent(ticker.symbol)}?period1=${period1}&period2=${period2}&interval=1d&includePrePost=false`;

      const response = await fetch(url, {
        signal: AbortSignal.timeout(20000),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const parsed = parseYahooResponse(data);

      if (parsed.length > 0) {
        console.log(`✓ Success: ${ticker.symbol} — ${parsed.length} data points`);
        return {
          data: parsed,
          tickerInfo: ticker,
        };
      }
    } catch (error) {
      console.warn(`Ticker ${ticker.symbol} failed:`, error.message);
      continue;
    }
  }

  throw new Error(
    'Não foi possível obter dados de mercado. Verifique sua conexão com a internet.'
  );
}

/**
 * Calculate daily returns from market data
 */
export function calculateReturns(data) {
  return data.map((item, i) => {
    if (i === 0) {
      return { ...item, dailyReturn: 0 };
    }
    const prevClose = data[i - 1].close;
    const dailyReturn = ((item.close - prevClose) / prevClose) * 100;
    return { ...item, dailyReturn };
  });
}

/**
 * Fetch Juros Futuros proxy (IRFM11 - ETF de Renda Fixa Prefixada)
 * Quando a expectativa de juros futuros sobe, este ETF cai (marcação a mercado)
 * @param {string} startDate 
 * @param {string} endDate 
 */
export async function fetchJurosFuturos(startDate, endDate) {
  const period1 = dateToUnix(startDate);
  const period2 = dateToUnix(endDate);
  const ticker = 'IRFM11.SA';

  console.log(`Trying ticker: ${ticker} (Juros Futuros Proxy)...`);
  const url = `${YAHOO_PROXY_PATH}/${encodeURIComponent(ticker)}?period1=${period1}&period2=${period2}&interval=1d&includePrePost=false`;

  const response = await fetch(url, {
    signal: AbortSignal.timeout(20000),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const data = await response.json();
  const parsed = parseYahooResponse(data);

  if (parsed.length > 0) {
    console.log(`✓ Success: ${ticker} — ${parsed.length} data points`);
    return parsed;
  }

  throw new Error('Não foi possível obter dados de Juros Futuros.');
}
