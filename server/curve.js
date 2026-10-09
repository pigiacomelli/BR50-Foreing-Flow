/** Flat-forward interpolation of annual effective DI1 rates; no extrapolation. */
export function interpolateOneYear(points, target = 252) {
  const sorted = points.filter(p => Number.isFinite(p.rate) && p.rate > -100 && Number.isInteger(p.days) && p.days > 0)
    .sort((a, b) => a.days - b.days);
  const lower = sorted.findLast(p => p.days <= target);
  const upper = sorted.find(p => p.days >= target);
  if (!lower || !upper) return null;
  const weight = lower.days === upper.days ? 0 : (target - lower.days) / (upper.days - lower.days);
  const logFactor = (1 - weight) * lower.days / 252 * Math.log1p(lower.rate / 100)
    + weight * upper.days / 252 * Math.log1p(upper.rate / 100);
  return { rate: Math.expm1(logFactor * 252 / target) * 100, lower, upper, weight };
}

export function createCalendar(previous, current) {
  const parse = text => new Set(text.split(/\r?\n/).filter(l => /^\d{2}\/\d{2}\/\d{4}$/.test(l.trim()))
    .map(l => l.trim().split('/').reverse().join('-')));
  const calendars = [parse(previous), parse(current)];
  if (calendars.some(c => c.size < 100)) throw new Error('Calendário de feriados inválido.');
  const dayMs = 86400000;
  // Prefix counts avoid scanning years for each contract on each trading date.
  const from = Date.parse('2000-01-01'); const until = Date.parse('2100-01-01');
  const counts = calendars.map(holidays => {
    const prefix = [0];
    for (let t = from; t < until; t += dayMs) {
      const d = new Date(t); const business = d.getUTCDay() !== 0 && d.getUTCDay() !== 6 && !holidays.has(d.toISOString().slice(0, 10));
      prefix.push(prefix.at(-1) + Number(business));
    }
    return prefix;
  });
  return (date, contract) => {
    if (!/^DI1[FGHJKMNQUVXZ]\d{2}$/.test(contract)) return null;
    const month = 'FGHJKMNQUVXZ'.indexOf(contract[3]);
    let expiry = Date.UTC(2000 + Number(contract.slice(4)), month, 1);
    const version = date < '2023-12-26' ? 0 : 1;
    const prefix = counts[version];
    const index = t => (t - from) / dayMs;
    if (expiry < from || expiry >= until || Date.parse(date) < from || Date.parse(date) >= until) return null;
    while (prefix[index(expiry) + 1] === prefix[index(expiry)]) expiry += dayMs;
    return { expiry: new Date(expiry).toISOString().slice(0, 10), days: prefix[index(expiry)] - prefix[index(Date.parse(date))] };
  };
}
