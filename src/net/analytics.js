// Client analytics : heatmap de frequentation + dwell time par stand.
export async function fetchHeatmap() {
  try {
    const r = await fetch("/api/analytics/heatmap");
    if (r.ok) return await r.json();
  } catch (e) { /* */ }
  return { cells: [] };
}

export async function fetchDwell() {
  try {
    const r = await fetch("/api/analytics/dwell");
    if (r.ok) return await r.json();
  } catch (e) { /* */ }
  return [];
}

export default { fetchHeatmap, fetchDwell };
