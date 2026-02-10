export function isDebugEnabled(): boolean {
  try {
    const env = (import.meta as any)?.env;
    const v = env?.PUBLIC_HOLI_DEBUG;
    return v === '1' || v === 'true' || v === true;
  } catch {
    return false;
  }
}

export function redact(value: string | null | undefined, keepPrefix: number = 8): string {
  if (!value) return 'null';
  if (value.length <= keepPrefix) return value;
  return `${value.slice(0, keepPrefix)}…`;
}

export function debugLog(...args: any[]) {
  if (!isDebugEnabled()) return;
   
  console.log(...args);
}

export function debugWarn(...args: any[]) {
  if (!isDebugEnabled()) return;
   
  console.warn(...args);
}
