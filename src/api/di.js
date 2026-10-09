export async function fetchDI(start, end) {
  const response = await fetch(`/api/di?${new URLSearchParams({ start, end })}`, {
    signal: AbortSignal.timeout(90000),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Não foi possível consultar o DI futuro.');
  return { ...result, data: result.data.map(r => ({ ...r, date: new Date(`${r.date}T12:00:00Z`) })) };
}
