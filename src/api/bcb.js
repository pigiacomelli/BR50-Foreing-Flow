/** BCB USD/BRL selling rate; server caches complete years. */
export async function fetchPTAX(start, end) {
  const response = await fetch(`/api/fx?${new URLSearchParams({ start, end })}`, { signal: AbortSignal.timeout(240000) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Não foi possível consultar o câmbio.');
  return result.data.map(r => ({ ...r, date: new Date(`${r.date}T12:00:00Z`) }));
}
