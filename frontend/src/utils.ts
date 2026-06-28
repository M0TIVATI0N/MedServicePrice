export function formatFreshness(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 0) return 'только что';
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'только что';
  if (mins < 60) return `${mins} мин. назад`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} ч. назад`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} дн. назад`;
  return new Date(iso).toLocaleDateString('ru-RU');
}

export function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function priceDeviation(price: number, avg: number): number {
  if (!avg) return 0;
  return ((price - avg) / avg) * 100;
}

export function deviationLabel(pct: number): string {
  if (Math.abs(pct) < 3) return '≈ медиана';
  if (pct < 0) return `${Math.abs(pct).toFixed(0)}% ниже медианы`;
  return `${pct.toFixed(0)}% выше медианы`;
}

export function build2gisRouteUrl(
  address: string,
  city: string,
  dest?: { lat: number; lng: number },
  from?: { lat: number; lng: number }
): string {
  const base = import.meta.env.VITE_2GIS_URL || 'https://2gis.kz';
  if (from && dest) {
    return `${base}/directions/points/${from.lng},${from.lat}|${dest.lng},${dest.lat}`;
  }
  if (dest) {
    return `${base}/search/${dest.lng},${dest.lat}`;
  }
  const query = [address, city].filter(Boolean).join(', ');
  return `${base}/search/${encodeURIComponent(query)}`;
}

export function sourceLabel(clinicId: string): string {
  if (clinicId.startsWith('kdl-')) return 'KDL';
  if (clinicId.startsWith('doq-')) return 'DOQ';
  if (clinicId.startsWith('invitro-')) return 'ИНВИТРО';
  if (clinicId.startsWith('helix-')) return 'Helix';
  if (clinicId.startsWith('gemotest-')) return 'Гемотест';
  return '';
}
