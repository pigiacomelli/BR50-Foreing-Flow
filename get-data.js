import { fetchPTAX, fetchSelic, calculateDailyChanges } from './src/api/bcb.js';
import { fetchMarketData, calculateReturns } from './src/api/market.js';
import { mergeByDate } from './src/utils/helpers.js';
import fs from 'fs';

// override fetch for node
global.fetch = async (url, options) => {
  if (url.startsWith('/api')) {
    if (url.includes('yahoo')) url = 'https://query1.finance.yahoo.com' + url.replace('/api/yahoo', '');
    if (url.includes('bcb')) url = 'https://api.bcb.gov.br' + url.replace('/api/bcb', '');
  }
  const https = await import('https');
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve({
        ok: true,
        json: async () => JSON.parse(body)
      }));
    }).on('error', reject);
  });
};

async function run() {
  try {
    const marketResult = await fetchMarketData('2010-01-01', '2026-09-07');
    const ptaxRaw = await fetchPTAX('2010-01-01', '2026-09-07');
    const selicRaw = await fetchSelic('2010-01-01', '2026-09-07');
    const merged = mergeByDate(calculateReturns(marketResult.data), calculateDailyChanges(ptaxRaw), selicRaw);
    fs.writeFileSync('./test-data.json', JSON.stringify(merged));
    console.log("Written merged data. Length:", merged.length);
  } catch(e){
    console.error(e);
  }
}
run();
