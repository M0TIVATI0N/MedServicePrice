export async function fetchJson<T>(url: string, signal?: AbortSignal): Promise<T | null> {
  try {
    const res = await fetch(url, signal ? { signal } : undefined);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') throw err;
    return null;
  }
}

export function asArray<T>(data: unknown): T[] {
  return Array.isArray(data) ? data : [];
}
