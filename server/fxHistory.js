import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fetchPTAXSources } from './fxSources.js';
import { validatePeriod } from './history.js';
export function createFXService({ root, fetchImpl = fetch }) {
  const pending = new Map();
  const request = async (url, options) => {
    url = url.replace('/api/bcb', 'https://api.bcb.gov.br').replace('/api/olinda', 'https://olinda.bcb.gov.br');
    let error;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await fetchImpl(url, { ...options, signal: AbortSignal.timeout(20000), headers: { 'User-Agent': 'Mozilla/5.0' } });
        if (response.ok) return response;
        error = new Error(`BCB: HTTP ${response.status}`);
      } catch (e) { error = e; }
    }
    throw error;
  };
  const yearData = async year => {
    const path = resolve(root, `data/cache/fx-${year}.json`);
    let cached;
    try { cached = JSON.parse(await readFile(path, 'utf8')); } catch (e) { if (e.code !== 'ENOENT') throw e; }
    if (cached && (year < new Date().getUTCFullYear() || Date.now() - Date.parse(cached.fetchedAt) < 3600000)) return cached.data;
    const end = `${year}-12-31` < new Date().toISOString().slice(0, 10) ? `${year}-12-31` : new Date().toISOString().slice(0, 10);
    const data = (await fetchPTAXSources(`${year}-01-01`, end, request)).map(r => ({ date: r.date.toISOString().slice(0, 10), value: r.value }));
    await mkdir(resolve(root, 'data/cache'), { recursive: true });
    await writeFile(`${path}.tmp`, JSON.stringify({ fetchedAt: new Date().toISOString(), data })); await rename(`${path}.tmp`, path);
    return data;
  };
  return async params => {
    validatePeriod(params);
    const years = Array.from({ length: Number(params.end.slice(0, 4)) - Number(params.start.slice(0, 4)) + 1 }, (_, i) => Number(params.start.slice(0, 4)) + i);
    const data = [];
    // Two concurrent years keep first load practical without flooding BCB.
    for (let i = 0; i < years.length; i += 2) {
      const settled = await Promise.allSettled(years.slice(i, i + 2).map(year => {
        if (!pending.has(year)) pending.set(year, yearData(year).finally(() => pending.delete(year)));
        return pending.get(year);
      }));
      for (const r of settled) { if (r.status === 'rejected') throw r.reason; data.push(...r.value); }
    }
    return { data: data.filter(r => r.date >= params.start && r.date <= params.end).sort((a,b) => a.date.localeCompare(b.date)) };
  };
}
