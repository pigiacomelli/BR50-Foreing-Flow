/**
 * BCB (Banco Central do Brasil) API Client
 * Fetches PTAX USD/BRL exchange rate data
 * Uses OLINDA API as primary source, SGS as fallback
 */

const BCB_SGS_URL = '/api/bcb/dados/serie/bcdata.sgs';
const BCB_OLINDA_URL = 'https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata';

/**
 * Format date as MM-DD-YYYY for OLINDA API
 */
function formatDateOlinda(dateStr) {
  const d = new Date(dateStr);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const year = d.getFullYear();
  return `'${month}-${day}-${year}'`;
}

/**
 * Format date as dd/MM/yyyy for SGS API
 */
function formatDateSGS(dateStr) {
  const d = new Date(dateStr);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Parse BCB SGS date format (dd/MM/yyyy) to Date object
 */
function parseSGSDate(dateStr) {
  const [day, month, year] = dateStr.split('/');
  return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
}

/**
 * Parse OLINDA datetime string to Date object
 * Format: "2024-01-02 13:09:22.874" or ISO format
 */
function parseOlindaDate(dateStr) {
  // Extract just the date part
  const datePart = dateStr.split(' ')[0].split('T')[0];
  const [year, month, day] = datePart.split('-');
  return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
}

/**
 * Fetch PTAX data from OLINDA API (primary method)
 * Fetches in yearly chunks to avoid API limits
 */
async function fetchFromOlinda(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  let allData = [];

  // Fetch in 1-year chunks to avoid API limits
  let chunkStart = new Date(start);
  while (chunkStart < end) {
    let chunkEnd = new Date(chunkStart.getFullYear() + 1, chunkStart.getMonth(), chunkStart.getDate());
    if (chunkEnd > end) chunkEnd = end;

    const startParam = formatDateOlinda(chunkStart.toISOString().split('T')[0]);
    const endParam = formatDateOlinda(chunkEnd.toISOString().split('T')[0]);

    const url = `${BCB_OLINDA_URL}/CotacaoDolarPeriodo(dataInicial=@dataInicial,dataFinalCotacao=@dataFinalCotacao)?` +
      `@dataInicial=${startParam}&@dataFinalCotacao=${endParam}` +
      `&$top=10000&$format=json&$select=cotacaoVenda,dataHoraCotacao` +
      `&$orderby=dataHoraCotacao asc`;

    console.log(`  BCB OLINDA: fetching ${chunkStart.getFullYear()}...`);
    
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`OLINDA API error: ${response.status}`);
    }

    const json = await response.json();
    const records = json.value || [];

    // Deduplicate by date (OLINDA may return multiple quotes per day)
    const byDate = new Map();
    for (const record of records) {
      const date = parseOlindaDate(record.dataHoraCotacao);
      const key = date.toISOString().split('T')[0];
      // Keep the last quote of each day
      byDate.set(key, {
        date,
        value: record.cotacaoVenda,
      });
    }

    allData = allData.concat(Array.from(byDate.values()));
    chunkStart = chunkEnd;
  }

  return allData.sort((a, b) => a.date - b.date);
}

/**
 * Fetch data from SGS API (fallback method)
 * Fetches in yearly chunks to avoid API limits (406 errors)
 */
async function fetchFromSGS(seriesCode, startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  let allData = [];

  let chunkStart = new Date(start);
  while (chunkStart < end) {
    let chunkEnd = new Date(chunkStart.getFullYear() + 1, chunkStart.getMonth(), chunkStart.getDate());
    if (chunkEnd > end) chunkEnd = end;

    const startParam = formatDateSGS(chunkStart.toISOString().split('T')[0]);
    const endParam = formatDateSGS(chunkEnd.toISOString().split('T')[0]);

    const url = `${BCB_SGS_URL}.${seriesCode}/dados?formato=json&dataInicial=${startParam}&dataFinal=${endParam}`;
    console.log(`  BCB SGS ${seriesCode}: fetching ${chunkStart.getFullYear()}...`);

    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 406) {
        console.warn(`SGS API returned 406 for ${chunkStart.getFullYear()}, maybe no data for this period.`);
      } else {
        throw new Error(`SGS API error: ${response.status}`);
      }
    } else {
      const data = await response.json();
      const parsedData = data.map(item => ({
        date: parseSGSDate(item.data),
        value: parseFloat(item.valor),
      })).filter(item => !isNaN(item.value));
      
      allData = allData.concat(parsedData);
    }
    
    chunkStart = chunkEnd;
  }

  return allData.sort((a, b) => a.date - b.date);
}

/**
 * Fetch PTAX USD/BRL daily exchange rate
 * Tries OLINDA API first, then falls back to SGS
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @returns {Promise<Array<{date: Date, value: number}>>}
 */
export async function fetchPTAX(startDate, endDate) {
  // Try OLINDA first (more reliable, better CORS support)
  try {
    console.log('📡 Fetching PTAX from BCB OLINDA API...');
    const data = await fetchFromOlinda(startDate, endDate);
    if (data.length > 0) {
      console.log(`✓ OLINDA: ${data.length} data points`);
      return data;
    }
  } catch (error) {
    console.warn('OLINDA API failed:', error.message);
  }

  // Fallback to SGS
  try {
    console.log('📡 Fallback: Fetching PTAX from BCB SGS API...');
    const data = await fetchFromSGS(1, startDate, endDate);
    console.log(`✓ SGS: ${data.length} data points`);
    return data;
  } catch (error) {
    console.warn('SGS API failed:', error.message);
  }

  throw new Error(
    'Não foi possível obter dados do Banco Central (BCB). Verifique sua conexão.'
  );
}

/**
 * Calculate daily changes from a price series
 */
export function calculateDailyChanges(series) {
  return series.map((item, i) => {
    if (i === 0) {
      return { ...item, change: 0, changePercent: 0 };
    }
    const prevValue = series[i - 1].value;
    const change = item.value - prevValue;
    const changePercent = (change / prevValue) * 100;
    return { ...item, change, changePercent };
  });
}

