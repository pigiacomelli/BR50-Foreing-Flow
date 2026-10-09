/** USD/BRL venda, BCB SGS série 1; OLINDA PTAX como alternativa. */
const iso = date => date.toISOString().slice(0, 10);
const brDate = str => str.split('-').reverse().join('/');

export async function fetchPTAXSources(startDate, endDate, fetchImpl = fetch) {
  const result = new Map();
  let cursor = startDate;
  while (cursor <= endDate) {
    const end = `${cursor.slice(0, 4)}-12-31` < endDate ? `${cursor.slice(0, 4)}-12-31` : endDate;
    let records;
    try {
      const params = new URLSearchParams({ formato: 'json', dataInicial: brDate(cursor), dataFinal: brDate(end) });
      const response = await fetchImpl(`/api/bcb/dados/serie/bcdata.sgs.1/dados?${params}`, { signal: AbortSignal.timeout(20000) });
      if (!response.ok) throw new Error(`BCB SGS: HTTP ${response.status}`);
      const data = await response.json();
      if (!Array.isArray(data)) throw new Error('Formato SGS inválido.');
      records = data.map(r => ({ date: r.data.split('/').reverse().join('-'), value: Number(r.valor) }));
    } catch {
      const olindaDate = str => `'${str.slice(5, 7)}-${str.slice(8, 10)}-${str.slice(0, 4)}'`;
      const params = new URLSearchParams({ '@dataInicial': olindaDate(cursor), '@dataFinalCotacao': olindaDate(end),
        '$format': 'json', '$top': '10000', '$orderby': 'dataHoraCotacao asc', '$select': 'cotacaoVenda,dataHoraCotacao' });
      const url = '/api/olinda/olinda/servico/PTAX/versao/v1/odata/CotacaoDolarPeriodo(dataInicial=@dataInicial,dataFinalCotacao=@dataFinalCotacao)';
      const response = await fetchImpl(`${url}?${params}`, { signal: AbortSignal.timeout(20000) });
      if (!response.ok) throw new Error(`BCB indisponível para ${cursor} a ${end}.`);
      const data = await response.json();
      if (!Array.isArray(data.value)) throw new Error('Resposta PTAX inválida.');
      records = data.value.map(r => ({ date: r.dataHoraCotacao.slice(0, 10), value: r.cotacaoVenda }));
    }
    for (const r of records) {
      if (r.date >= startDate && r.date <= endDate && Number.isFinite(r.value) && r.value > 0) {
        result.set(r.date, { date: new Date(`${r.date}T12:00:00Z`), value: r.value });
      }
    }
    const next = new Date(`${end}T12:00:00Z`); next.setUTCDate(next.getUTCDate() + 1); cursor = iso(next);
  }
  if (!result.size) throw new Error('Sem dados de câmbio no período solicitado.');
  return [...result.values()].sort((a, b) => a.date - b.date);
}
