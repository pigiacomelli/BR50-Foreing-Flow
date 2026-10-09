import { readFile, mkdir, writeFile, rename } from 'node:fs/promises';
import { resolve } from 'node:path';
import { validatePeriod } from './history.js';
export function parseIndexYear(payload, year) {
  if (!Array.isArray(payload.results)) throw new Error('Resposta do histórico IBrX-50 inválida.');
  const rows = [];
  for (const row of payload.results) for (let month = 1; month <= 12; month++) {
    const raw = row[`rateValue${month}`];
    if (typeof raw !== 'string' || !raw.trim()) continue;
    const close = Number(raw.replaceAll('.', '').replace(',', '.'));
    const date = `${year}-${String(month).padStart(2, '0')}-${String(row.day).padStart(2, '0')}`;
    if (Number.isFinite(close) && close > 0 && Number.isInteger(row.day) && new Date(date).toISOString().slice(0, 10) === date) rows.push({ date, close });
  }
  return rows.sort((a, b) => a.date.localeCompare(b.date));
}
export function createIndexService({ root, fetchImpl = fetch }) {
  const pending = new Map();
  async function getYear(year) {
    const path = resolve(root, `data/cache/index-${year}.json`);
    let saved;
    try { saved = JSON.parse(await readFile(path, 'utf8')); } catch (e) { if (e.code !== 'ENOENT') throw e; }
    if (saved && (year < new Date().getUTCFullYear() || Date.now() - Date.parse(saved.fetchedAt) < 3600000)) return saved.data;
    const query = Buffer.from(JSON.stringify({ language: 'pt-br', year, index: 'IBXL' })).toString('base64');
    const response = await fetchImpl(`https://sistemaswebb3-listados.b3.com.br/indexStatisticsProxy/IndexCall/GetPortfolioDay/${query}`, { signal: AbortSignal.timeout(20000) });
    if (!response.ok) throw new Error(`IBrX-50 B3: HTTP ${response.status} (${year}).`);
    const data = parseIndexYear(await response.json(), year);
    if (!data.length) throw new Error(`Sem dados IBrX-50 para ${year}.`);
    await mkdir(resolve(root, 'data/cache'), { recursive: true });
    await writeFile(`${path}.tmp`, JSON.stringify({ fetchedAt: new Date().toISOString(), data })); await rename(`${path}.tmp`, path);
    return data;
  }
  return async params => {
    validatePeriod(params);
    const data = [];
    for (let year = Number(params.start.slice(0, 4)); year <= Number(params.end.slice(0, 4)); year++) {
      if (!pending.has(year)) pending.set(year, getYear(year).finally(() => pending.delete(year)));
      data.push(...await pending.get(year));
    }
    return { tickerInfo: { symbol: 'IBXL', name: 'IBrX-50', source: 'B3 — histórico diário do índice' }, data: data.filter(r => r.date >= params.start && r.date <= params.end) };
  };
}
