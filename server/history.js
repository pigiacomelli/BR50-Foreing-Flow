import { readFile, mkdir, writeFile, rename } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { parquetReadObjects } from 'hyparquet';
import { compressors } from 'hyparquet-compressors';
import { createCalendar, interpolateOneYear } from './curve.js';

export const DI_SOURCE = 'https://github.com/crdcj/pyield-data/releases/latest/download/b3_futures.parquet';
export const validDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value || '') && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
export function validatePeriod({ start, end }) {
  if (!validDate(start) || !validDate(end) || start > end || start < '2010-01-01' || end > new Date().toISOString().slice(0, 10)) throw new Error('Selecione um período desde 2010 até hoje.');
}

export async function buildHistory(buffer, root) {
  const [previous, current] = await Promise.all(['anteriores', 'atuais'].map(name => readFile(resolve(root, `data/calendars/${name}.txt`), 'utf8')));
  const maturity = createCalendar(previous, current);
  const rows = await parquetReadObjects({ file: buffer, columns: ['TradDt', 'TckrSymb', 'AdjstdQtTax'], compressors });
  const groups = new Map();
  for (const row of rows) {
    if (!/^DI1[FGHJKMNQUVXZ]\d{2}$/.test(row.TckrSymb) || !Number.isFinite(row.AdjstdQtTax)) continue;
    const date = row.TradDt.toISOString().slice(0, 10);
    const point = { contract: row.TckrSymb, rate: row.AdjstdQtTax, ...maturity(date, row.TckrSymb) };
    if (!groups.has(date)) groups.set(date, []);
    groups.get(date).push(point);
  }
  const data = [];
  for (const [date, points] of groups) {
    const interpolated = interpolateOneYear(points);
    if (interpolated) data.push({ date, ...interpolated });
  }
  data.sort((a, b) => a.date.localeCompare(b.date));
  if (!data.length) throw new Error('Base recebida sem curvas DI1 válidas.');
  return { data, source: DI_SOURCE, sha256: createHash('sha256').update(Buffer.from(buffer)).digest('hex'), fetchedAt: new Date().toISOString() };
}

export function createHistoryService({ root, fetchImpl = fetch }) {
  const path = resolve(root, 'data/cache/di-1y.json');
  let pending;
  async function refresh() {
    let cached;
    try { cached = JSON.parse(await readFile(path, 'utf8')); } catch (e) { if (e.code !== 'ENOENT') throw e; }
    if (cached && Date.now() - Date.parse(cached.fetchedAt) < 86400000) return cached;
    try {
      const response = await fetchImpl(DI_SOURCE, { signal: AbortSignal.timeout(60000) });
      if (!response.ok) throw new Error(`Histórico DI: HTTP ${response.status}`);
      const result = await buildHistory(await response.arrayBuffer(), root);
      await mkdir(resolve(root, 'data/cache'), { recursive: true });
      await writeFile(`${path}.tmp`, JSON.stringify(result)); await rename(`${path}.tmp`, path);
      return result;
    } catch (error) {
      if (!cached) throw error;
      return { ...cached, warning: 'Falha na atualização do DI. Exibindo a base salva localmente.' };
    }
  }
  return async params => {
    validatePeriod(params);
    if (!pending) pending = refresh().finally(() => { pending = null; });
    const result = await pending;
    const first = result.data[0].date;
    return { ...result, contract: 'DI 1 ano', targetBusinessDays: 252,
      coverageNote: `DI1 da B3, distribuído pelo PYield. Base disponível: ${first} a ${result.data.at(-1).date}. Prazo constante de 252 dias úteis, sem extrapolação.`,
      warning: [result.warning, params.start < first ? `Histórico incompleto: esta base não contém DI antes de ${first}.` : null].filter(Boolean).join(' '),
      data: result.data.filter(r => r.date >= params.start && r.date <= params.end) };
  };
}
