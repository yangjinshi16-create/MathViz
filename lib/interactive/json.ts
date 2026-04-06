export function parseJsonResponse<T>(response: string): T | null {
  const trimmed = response.trim();
  try {
    return JSON.parse(trimmed) as T;
  } catch {
    const first = trimmed.indexOf('{');
    const last = trimmed.lastIndexOf('}');
    if (first === -1 || last === -1 || last <= first) return null;
    try {
      return JSON.parse(trimmed.slice(first, last + 1)) as T;
    } catch {
      return null;
    }
  }
}
