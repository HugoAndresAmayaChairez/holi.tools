/**
 * Config Manager
 * Uses localStorage for fast, synchronous UI state persistence
 *
 * Use cases:
 * - Window positions
 * - Panel visibility states
 * - User preferences (theme, language)
 * - Tool settings
 */

const PREFIX = "holi:";

/**
 * Get a config value (synchronous, instant)
 */
export function get<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (raw === null) return defaultValue;
    return JSON.parse(raw) as T;
  } catch {
    return defaultValue;
  }
}

/**
 * Set a config value (synchronous, instant)
 */
export function set<T>(key: string, value: T): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch (e) {
    console.warn("Failed to save config:", key, e);
  }
}

/**
 * Remove a config value
 */
export function remove(key: string): void {
  localStorage.removeItem(PREFIX + key);
}

/**
 * Get all config keys
 */
export function keys(): string[] {
  const result: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(PREFIX)) {
      result.push(key.slice(PREFIX.length));
    }
  }
  return result;
}

/**
 * Clear all Holi config
 */
export function clear(): void {
  for (const key of keys()) {
    remove(key);
  }
}

// === Typed Helpers for Common Use Cases ===

export interface WindowPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function getWindowPosition(windowId: string): WindowPosition | null {
  return get<WindowPosition | null>(`window:${windowId}`, null);
}

export function setWindowPosition(windowId: string, pos: WindowPosition): void {
  set(`window:${windowId}`, pos);
}

export function getPanelVisible(
  panelId: string,
  defaultVisible = true
): boolean {
  return get(`panel:${panelId}:visible`, defaultVisible);
}

export function setPanelVisible(panelId: string, visible: boolean): void {
  set(`panel:${panelId}:visible`, visible);
}

// === P2P Configuration ===

export const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
  { urls: "stun:stun3.l.google.com:19302" },
  { urls: "stun:stun4.l.google.com:19302" },
  // Extra public STUN to improve odds across networks.
  { urls: "stun:global.stun.twilio.com:3478" },
  { urls: "stun:stun.cloudflare.com:3478" },
];

function parseIceServers(raw: string): RTCIceServer[] | null {
  try {
    const parsed = JSON.parse(raw) as any;
    if (Array.isArray(parsed)) return parsed as RTCIceServer[];
    if (
      parsed &&
      typeof parsed === "object" &&
      Array.isArray(parsed.iceServers)
    ) {
      return parsed.iceServers as RTCIceServer[];
    }
    return null;
  } catch {
    return null;
  }
}

function parseIceTransportPolicy(raw: unknown): RTCIceTransportPolicy | null {
  if (raw === "relay" || raw === "all") return raw;
  return null;
}

/**
 * Get ICE servers.
 * Allows overrides for production diagnostics / TURN rollout:
 * - `localStorage["holi:iceServers"] = JSON.stringify([{urls:"turn:...", username:"...", credential:"..."}])`
 * - `PUBLIC_HOLI_ICE_SERVERS='[{"urls":"turn:...","username":"...","credential":"..."}]'`
 */
export function getIceServers(): RTCIceServer[] {
  // Runtime override (no redeploy).
  try {
    const raw = window?.localStorage?.getItem("holi:iceServers");
    if (raw) {
      const v = parseIceServers(raw);
      if (v && v.length) return v;
    }
  } catch {
    // ignore
  }

  // Build-time env override.
  try {
    const raw = (import.meta as any).env?.PUBLIC_HOLI_ICE_SERVERS as
      | string
      | undefined;
    if (raw) {
      const v = parseIceServers(raw);
      if (v && v.length) return v;
    }
  } catch {
    // ignore
  }

  return ICE_SERVERS;
}

/**
 * Get WebRTC RTCConfiguration.
 * Supports forcing TURN-only mode to reduce candidate churn / improve NAT traversal when TURN is present:
 * - `localStorage["holi:iceTransportPolicy"]="relay"`
 * - `PUBLIC_HOLI_ICE_TRANSPORT_POLICY="relay"`
 */
export function getRtcConfig(): RTCConfiguration {
  let iceTransportPolicy: RTCIceTransportPolicy | undefined;

  try {
    iceTransportPolicy =
      parseIceTransportPolicy(
        window?.localStorage?.getItem("holi:iceTransportPolicy")
      ) ?? undefined;
  } catch {
    // ignore
  }

  try {
    const raw = (import.meta as any).env?.PUBLIC_HOLI_ICE_TRANSPORT_POLICY as
      | string
      | undefined;
    iceTransportPolicy =
      iceTransportPolicy ?? parseIceTransportPolicy(raw) ?? undefined;
  } catch {
    // ignore
  }

  return {
    iceServers: getIceServers(),
    ...(iceTransportPolicy ? { iceTransportPolicy } : null),
  } as RTCConfiguration;
}
