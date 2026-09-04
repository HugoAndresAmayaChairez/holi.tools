import { joinRoom } from "trystero";

import { getRtcConfig } from "../config";
import { debugWarn } from "../debug";

export interface TrysteroConfig {
  appId: string;
  password?: string;
}

type PeerTarget = string | string[] | null;

type TrysteroJoinError = {
  error: string;
  appId: string;
  roomId: string;
  peerId: string;
};

type LegacyActionSender<T> = (
  data: T,
  targetPeers?: PeerTarget,
  metadata?: unknown,
  progress?: (percent: number, peerId: string, metadata?: unknown) => void
) => Promise<void>;

type LegacyActionReceiver<T> = (
  handler: (data: T, peerId: string, metadata?: unknown) => void | Promise<void>
) => void;

type LegacyActionProgress = (
  handler: (percent: number, peerId: string, metadata?: unknown) => void
) => void;

export type TrysteroRoom = {
  makeAction<T>(
    namespace: string
  ): [LegacyActionSender<T>, LegacyActionReceiver<T>, LegacyActionProgress];
  onPeerJoin(handler: (peerId: string) => void): void;
  onPeerLeave(handler: (peerId: string) => void): void;
  getPeers(): Record<string, RTCPeerConnection>;
  leave(): void;
};

function parseRelayRedundancy(raw: unknown): number | null {
  const n =
    typeof raw === "string" ? Number(raw) : typeof raw === "number" ? raw : NaN;
  if (!Number.isFinite(n)) return null;
  return Math.max(1, Math.min(8, Math.floor(n)));
}

function parseRelayList(raw: unknown): string[] | null {
  if (typeof raw !== "string") return null;
  const list = Array.from(
    new Set(
      raw
        .split(",")
        .map((value) => value.trim())
        .filter((value) => value.startsWith("wss://"))
    )
  );
  return list.length ? list : null;
}

function getRelayOverrides(): {
  urls?: string[];
  redundancy?: number;
} | null {
  let urls: string[] | null = null;
  let redundancy: number | null = null;

  try {
    urls = parseRelayList(window.localStorage?.getItem("holi:nostrRelays"));
    redundancy = parseRelayRedundancy(
      window.localStorage?.getItem("holi:nostrRelayRedundancy")
    );
  } catch {
    // Runtime overrides are optional.
  }

  const env = (import.meta as any).env;
  urls = urls ?? parseRelayList(env?.PUBLIC_HOLI_NOSTR_RELAYS);
  redundancy =
    redundancy ??
    parseRelayRedundancy(env?.PUBLIC_HOLI_NOSTR_RELAY_REDUNDANCY);

  if (!urls && !redundancy) return null;
  return {
    ...(urls ? { urls } : null),
    ...(!urls && redundancy ? { redundancy } : null),
  };
}

/**
 * Trystero 0.25 moved actions and peer listeners to an object-based API.
 * This adapter keeps Holi's existing room contract while using the current,
 * more resilient Nostr signaling implementation underneath.
 */
function toLegacyRoom(nativeRoom: any): TrysteroRoom {
  const actionCache = new Map<string, any>();
  const peerJoinHandlers = new Set<(peerId: string) => void>();
  const peerLeaveHandlers = new Set<(peerId: string) => void>();

  nativeRoom.onPeerJoin = (peerId: string) => {
    for (const handler of peerJoinHandlers) handler(peerId);
  };
  nativeRoom.onPeerLeave = (peerId: string) => {
    for (const handler of peerLeaveHandlers) handler(peerId);
  };

  const room: TrysteroRoom = {
    makeAction<T>(namespace: string) {
      const cached = actionCache.get(namespace);
      if (cached) return cached;

      const action = nativeRoom.makeAction(namespace);
      const messageHandlers = new Set<
        (data: T, peerId: string, metadata?: unknown) => void | Promise<void>
      >();
      const progressHandlers = new Set<
        (percent: number, peerId: string, metadata?: unknown) => void
      >();

      action.onMessage = async (
        data: T,
        context: { peerId: string; metadata?: unknown }
      ) => {
        await Promise.all(
          Array.from(messageHandlers, (handler) =>
            handler(data, context.peerId, context.metadata)
          )
        );
      };
      action.onReceiveProgress = (
        percent: number,
        context: { peerId: string; metadata?: unknown }
      ) => {
        for (const handler of progressHandlers) {
          handler(percent, context.peerId, context.metadata);
        }
      };

      const send: LegacyActionSender<T> = async (
        data,
        targetPeers,
        metadata,
        progress
      ) => {
        const options = {
          ...(targetPeers !== undefined ? { target: targetPeers } : null),
          ...(metadata !== undefined ? { metadata } : null),
          ...(progress
            ? {
                onProgress: (
                  percent: number,
                  context: { peerId: string; metadata?: unknown }
                ) => progress(percent, context.peerId, context.metadata),
              }
            : null),
        };
        await action.send(data, options);
      };

      const receive: LegacyActionReceiver<T> = (handler) => {
        messageHandlers.add(handler);
      };
      const onProgress: LegacyActionProgress = (handler) => {
        progressHandlers.add(handler);
      };

      const legacyAction: [
        LegacyActionSender<T>,
        LegacyActionReceiver<T>,
        LegacyActionProgress,
      ] = [send, receive, onProgress];
      actionCache.set(namespace, legacyAction);
      return legacyAction;
    },
    onPeerJoin(handler) {
      peerJoinHandlers.add(handler);
      for (const peerId of Object.keys(nativeRoom.getPeers?.() || {})) {
        handler(peerId);
      }
    },
    onPeerLeave(handler) {
      peerLeaveHandlers.add(handler);
    },
    getPeers() {
      return nativeRoom.getPeers?.() || {};
    },
    leave() {
      peerJoinHandlers.clear();
      peerLeaveHandlers.clear();
      actionCache.clear();
      void Promise.resolve(nativeRoom.leave()).catch((error) => {
        debugWarn("[Trystero] Failed to leave room", error);
      });
    },
  };

  return room;
}

/**
 * Global Trystero factory using the library's maintained Nostr relay pool.
 * Custom relays are only applied when explicitly configured; otherwise the
 * package can drop incompatible/rate-limited relays and restore subscriptions.
 */
export function joinTrysteroRoom(
  config: TrysteroConfig,
  roomId: string,
  overrides?: {
    relayUrls?: string[];
    rtcConfig?: RTCConfiguration;
    onJoinError?: (details: TrysteroJoinError) => void;
  }
): TrysteroRoom {
  const configuredRelayOverrides = getRelayOverrides();
  const relayConfig = overrides?.relayUrls
    ? { urls: overrides.relayUrls }
    : configuredRelayOverrides;

  const nativeRoom = joinRoom(
    {
      ...config,
      ...(relayConfig ? { relayConfig } : null),
      rtcConfig: overrides?.rtcConfig ?? getRtcConfig(),
    },
    roomId,
    overrides?.onJoinError
      ? { onJoinError: overrides.onJoinError }
      : undefined
  );

  return toLegacyRoom(nativeRoom);
}
