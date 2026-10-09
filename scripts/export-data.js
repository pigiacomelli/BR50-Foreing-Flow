/** Export exactly the same observations used by the local dashboard. */
import { mkdir, writeFile } from 'node:fs/promises';
import { fetchMarketData } from '../src/api/market.js';
import { fetchPTAX } from '../src/api/bcb.js';
import { fetchDI } from '../src/api/di.js';
import { runFullAnalysis } from '../src/analysis/statistics.js';
import { mergeByDate } from '../src/utils/helpers.js';
const [start, end] = process.argv.slice(2);
if (!/^\d{4}-\d{2}-\d{2}$/.test(start || '') || !/^\d{4}-\d{2}-\d{2}$/.test(end || '') || start > end) {
  console.error('Uso: npm run export:data -- 2010-01-01 2026-10-08 (com npm run dev em execução)');
  process.exit(1);
}
const originalFetch = globalThis.fetch;
globalThis.fetch = (url, options) => originalFetch(new URL(url, 'http://127.0.0.1:3000'), options);
const [market, fx, di] = await Promise.all([fetchMarketData(start, end), fetchPTAX(start, end), fetchDI(start, end)]);
await mkdir('exports', { recursive: true });
const path = `exports/study-${start}-${end}-DI-1ano.json`;
const observations = mergeByDate(market.data, fx, di.data);
const statistics = Object.fromEntries(['usd-index','di-index','di-usd'].map(pair => [pair, runFullAnalysis(observations, pair)]));
await writeFile(path, JSON.stringify({ exportedAt: new Date().toISOString(), index: market.tickerInfo,
  di, observations, statistics }, null, 2));
console.log(`Dados exportados: ${path}`);
