export function isDebugEnabled(): boolean {
  try {
    const env = (import.meta as any)?.env;
    const v = env?.PUBLIC_HOLI_DEBUG;
    if (v === "1" || v === "true" || v === true) return true;
    if (typeof window !== "undefined") {
      const runtime = window.localStorage?.getItem("holi:debug");
      return runtime === "1" || runtime === "true";
    }
    return false;
  } catch {
    return false;
  }
}

export function redact(
  value: string | null | undefined,
  keepPrefix: number = 8
): string {
  if (!value) return "null";
  if (value.length <= keepPrefix) return value;
  return `${value.slice(0, keepPrefix)}...`;
}

export function debugLog(...args: any[]) {
  if (!isDebugEnabled()) return;

  console.log(...args);
}

export function debugWarn(...args: any[]) {
  if (!isDebugEnabled()) return;

  console.warn(...args);
}
