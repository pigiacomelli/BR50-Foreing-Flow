import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { interpolateOneYear, createCalendar } from '../server/curve.js';
import { createHistoryService, validatePeriod } from '../server/history.js';
import { parseIndexYear } from '../server/indexHistory.js';

test('flat-forward preserves constant rates and exact vertices, without extrapolation', () => {
  const points = [{ days: 126, rate: 10 }, { days: 378, rate: 10 }];
  assert.ok(Math.abs(interpolateOneYear(points).rate - 10) < 1e-10);
  assert.ok(Math.abs(interpolateOneYear([{ days: 252, rate: 12 }]).rate - 12) < 1e-10);
  assert.equal(interpolateOneYear([{ days: 253, rate: 10 }]), null);
  assert.equal(interpolateOneYear([{ days: 251, rate: 10 }]), null);
  assert.equal(interpolateOneYear([{ days: 252, rate: null }]), null);
  const expected = (Math.sqrt(Math.pow(1.1, 0.5) * Math.pow(1.2, 1.5)) - 1) * 100;
  assert.ok(Math.abs(interpolateOneYear([{ days: 126, rate: 10 }, { days: 378, rate: 20 }]).rate - expected) < 1e-10);
});

test('calendar rolls maturity and uses the historical holiday version', async () => {
  const text = await Promise.all(['anteriores','atuais'].map(n => readFile(new URL(`../data/calendars/${n}.txt`,import.meta.url),'utf8')));
  const maturity = createCalendar(...text);
  assert.deepEqual(maturity('2018-01-02', 'DI1F19'), { expiry: '2019-01-02', days: 250 });
  assert.deepEqual(maturity('2026-10-08', 'DI1V27'), { expiry: '2027-10-01', days: 245 });
  assert.equal(maturity('2023-12-22', 'DI1F25').days - maturity('2023-12-26', 'DI1F25').days, 2);
});

test('history serves cache with coverage warning, and survives a failed refresh', async () => {
  const root = await mkdtemp(join(tmpdir(), 'br50-history-'));
  try {
    await mkdir(join(root, 'data/cache'), { recursive: true });
    const saved = { fetchedAt: '2000-01-01', data: [{ date: '2018-01-02', rate: 6.8 }] };
    await writeFile(join(root, 'data/cache/di-1y.json'), JSON.stringify(saved));
    let calls = 0;
    const service = createHistoryService({ root, fetchImpl: async () => { calls++; throw new Error('offline'); } });
    const [first, second] = await Promise.all([service({ start:'2010-01-01', end:'2020-01-01' }),service({ start:'2019-01-01', end:'2020-01-01' })]);
    assert.equal(calls, 1); assert.equal(first.data.length,1); assert.equal(second.data.length,0);
    assert.match(first.warning,/incompleto/); assert.match(first.warning,/salva localmente/);
    assert.throws(() => validatePeriod({ start:'2020-02-30',end:'2021-01-01' }),/período/);
  } finally { await rm(root,{recursive:true}); }
});

test('official index parser preserves daily closes and ignores empty months', () => {
  const result = parseIndexYear({results:[{day:4,rateValue1:'9.860,49',rateValue2:null}]},2010);
  assert.deepEqual(result,[{date:'2010-01-04',close:9860.49}]);
  assert.throws(() => parseIndexYear({},2010),/inválida/);
});

test('FX source retries transient failures and reuses completed years', async () => {
  const { createFXService } = await import('../server/fxHistory.js');
  const root = await mkdtemp(join(tmpdir(), 'br50-fx-'));
  let calls = 0;
  const service = createFXService({ root, fetchImpl: async () => {
    calls++;
    if (calls === 1) return { ok: false, status: 503 };
    return { ok: true, json: async () => [{ data:'04/01/2010', valor:'1.724' }] };
  } });
  try {
    const params = { start:'2010-01-01', end:'2010-12-31' };
    assert.deepEqual((await service(params)).data,[{date:'2010-01-04',value:1.724}]);
    await service(params); assert.equal(calls,2);
  } finally { await rm(root,{recursive:true}); }
});
