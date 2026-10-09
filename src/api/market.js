/** Official aggregate IBrX-50 history, including 2010 onward. */
export async function fetchMarketData(start, end) {
  const response = await fetch(`/api/index?${new URLSearchParams({ start, end })}`, { signal: AbortSignal.timeout(180000) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Não foi possível consultar o IBrX-50.');
  return { ...result, data: result.data.map(r => ({ ...r, date: new Date(`${r.date}T12:00:00Z`) })) };
}
