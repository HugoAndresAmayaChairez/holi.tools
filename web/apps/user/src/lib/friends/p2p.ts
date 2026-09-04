/**
 * Friend DM P2P Connection via Trystero
 *
 * Adapts Trystero actions to the RTCDataChannel surface consumed by ChatManager.
 */
import { joinTrysteroRoom } from "../p2p/trystero-client";
import { debugLog, debugWarn, redact } from "../debug";
import type { FriendDmConfig } from "./dm";

export type { FriendDmConfig } from "./dm";

const DM_APP_ID = "holi-dm-v1";

type BufferedAmountLowListener = (ev: Event) => void;

class TrysteroActionDataChannel {
  public readonly label: string;
  public readyState: RTCDataChannelState = "connecting";
  public binaryType: BinaryType = "arraybuffer";
  public bufferedAmount = 0;
  public bufferedAmountLowThreshold = 0;

  private messageHandler: ((ev: MessageEvent) => void) | null = null;
  public onclose: ((ev: Event) => void) | null = null;

  private bufferedLowListeners = new Set<BufferedAmountLowListener>();
  private pendingMessages: ArrayBuffer[] = [];
  private closed = false;

  constructor(
    label: string,
    private room: any,
    private sendFrame: (frame: Uint8Array) => unknown
  ) {
    this.label = label;
  }

  private sendFrameSafe(frame: Uint8Array) {
    try {
      const result = this.sendFrame(frame);
      void Promise.resolve(result).catch((e) => {
        debugWarn("[DM] Failed to send frame", e);
        this.close();
      });
    } catch (e) {
      debugWarn("[DM] Failed to send frame", e);
      this.close();
      throw e;
    }
  }

  public _setOpen() {
    if (this.closed) return;
    this.readyState = "open";
    this.flushPendingMessages();
  }

  public _setWaitingForPeer() {
    if (this.closed) return;
    this.readyState = "connecting";
  }

  public get onmessage(): ((ev: MessageEvent) => void) | null {
    return this.messageHandler;
  }

  public set onmessage(handler: ((ev: MessageEvent) => void) | null) {
    this.messageHandler = handler;
    this.flushPendingMessages();
  }

  private flushPendingMessages() {
    if (this.closed || this.readyState !== "open" || !this.messageHandler) {
      return;
    }

    const queued = this.pendingMessages.splice(0);
    for (const data of queued) {
      this.messageHandler({ data } as MessageEvent);
    }
  }

  public _emitMessage(data: unknown) {
    if (this.closed) return;

    let bytes: Uint8Array | null = null;
    if (data instanceof Uint8Array) {
      bytes = data;
    } else if (data instanceof ArrayBuffer) {
      bytes = new Uint8Array(data);
    } else if (ArrayBuffer.isView(data)) {
      bytes = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
    }

    if (!bytes) return;

    // Provide ArrayBuffer to match RTCDataChannel message events.
    const copy = new Uint8Array(bytes.byteLength);
    copy.set(bytes);
    const ab = copy.buffer;
    if (this.readyState !== "open" || !this.messageHandler) {
      // The peer can send immediately after its own join resolves. Keep a small
      // bounded queue until ChatManager attaches its receiver on this side.
      if (this.pendingMessages.length >= 128) this.pendingMessages.shift();
      this.pendingMessages.push(ab);
      return;
    }

    this.messageHandler({ data: ab } as MessageEvent);
  }

  public send(data: string | ArrayBuffer | ArrayBufferView | Blob) {
    if (this.closed || this.readyState !== "open") {
      throw new Error("Channel is not open");
    }

    if (typeof data === "string") {
      const bytes = new TextEncoder().encode(data);
      this.sendFrameSafe(bytes);
      return;
    }

    if (data instanceof Blob) {
      void data
        .arrayBuffer()
        .then((ab) => this.sendFrameSafe(new Uint8Array(ab)));
      return;
    }

    if (data instanceof ArrayBuffer) {
      this.sendFrameSafe(new Uint8Array(data));
      return;
    }

    if (ArrayBuffer.isView(data)) {
      this.sendFrameSafe(
        new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
      );
      return;
    }
  }

  public close() {
    if (this.closed) return;
    this.closed = true;
    this.readyState = "closed";
    this.pendingMessages = [];
    try {
      this.room.leave();
    } catch {
      // ignore
    }
    this.onclose?.(new Event("close"));
  }

  public addEventListener(type: string, listener: any, opts?: any) {
    if (type !== "bufferedamountlow") return;
    const once = Boolean(
      opts && typeof opts === "object" && opts.once === true
    );
    const wrapped: BufferedAmountLowListener = once
      ? (ev) => {
          this.bufferedLowListeners.delete(wrapped);
          listener(ev);
        }
      : listener;
    this.bufferedLowListeners.add(wrapped);

    // If we never track bufferedAmount, act as if we're always below threshold.
    queueMicrotask(() => {
      if (this.closed) return;
      if (this.bufferedAmount <= this.bufferedAmountLowThreshold) {
        for (const fn of Array.from(this.bufferedLowListeners))
          fn(new Event("bufferedamountlow"));
      }
    });
  }
}

/**
 * Both peers join the same password-protected signaling room. ChatManager adds
 * a second, application-layer encrypted protocol over the returned channel.
 */
export async function connectFriendDmChannel(opts: {
  dm: FriendDmConfig;
  isInitiator: boolean;
  timeoutMs?: number;
  peerReconnectGraceMs?: number;
  abortSignal?: AbortSignal;
  onPeerUnavailable?: () => void;
  onPeerAvailable?: () => void;
}): Promise<RTCDataChannel> {
  const timeoutMs = opts.timeoutMs ?? 60_000;
  const peerReconnectGraceMs = opts.peerReconnectGraceMs ?? 20_000;

  return new Promise((resolve, reject) => {
    // Room ID is derived from sessionId (already unique per friend pair)
    const roomId = `dm-${opts.dm.sessionId}`;

    debugLog("[DM] Connecting (channel)", {
      initiator: opts.isInitiator,
      signaling: "managed-nostr-pool",
    });

    let sawPeerTraffic = false;
    let lastJoinError: string | null = null;

    const room = joinTrysteroRoom(
      { appId: DM_APP_ID, password: opts.dm.keyB64Url },
      roomId,
      {
        onJoinError: (details) => {
          lastJoinError = details.error;
          debugWarn("[DM] Trystero join error", {
            error: details.error,
            peerId: redact(details.peerId),
          });
        },
      }
    );

    const [sendFrame, onFrame] = room.makeAction<Uint8Array>("dm-frame");
    // Separate lightweight probe channel to detect readiness without interfering with encrypted Chat frames.
    const [sendProbe, onProbe] = room.makeAction<string>("dm-probe");

    const channel = new TrysteroActionDataChannel(
      `dm:${opts.dm.sessionId}`,
      room,
      (frame) => {
        return sendFrame(frame);
      }
    );

    let poll: number | null = null;
    let probeTimer: number | null = null;
    let peerReconnectTimer: number | null = null;
    let peerUnavailable = false;

    let settled = false;

    const cleanupTimers = () => {
      if (probeTimer !== null) {
        try {
          window.clearInterval(probeTimer);
        } catch {
          // ignore
        }
        probeTimer = null;
      }
      if (poll !== null) {
        try {
          window.clearInterval(poll);
        } catch {
          // ignore
        }
        poll = null;
      }
      if (peerReconnectTimer !== null) {
        try {
          window.clearTimeout(peerReconnectTimer);
        } catch {
          // ignore
        }
        peerReconnectTimer = null;
      }
    };

    const leaveRoom = () => {
      cleanupTimers();
      try {
        room.leave();
      } catch {
        // ignore
      }
    };

    const timer = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      opts.abortSignal?.removeEventListener("abort", abortHandler);
      leaveRoom();
      const reason = lastJoinError
        ? `The signaling relay reported a join error: ${lastJoinError}.`
        : sawPeerTraffic
          ? "Signaling traffic was seen, but the WebRTC channel did not open. Check ICE/TURN settings for this network."
          : "No peer signaling was detected. Check that both sides opened the exact link and that Nostr WebSocket relays are reachable.";
      reject(new Error(`DM connection timed out. ${reason}`));
    }, timeoutMs);

    const abortHandler = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      opts.abortSignal?.removeEventListener("abort", abortHandler);
      leaveRoom();
      reject(new Error("Aborted"));
    };

    if (opts.abortSignal?.aborted) {
      abortHandler();
      return;
    }
    opts.abortSignal?.addEventListener("abort", abortHandler, { once: true });

    // Wire incoming frames into the channel-like interface
    onFrame((data: unknown, peerId: string) => {
      debugLog("[DM] Frame received", { peerId: redact(peerId) });
      sawPeerTraffic = true;
      markPeerAvailable();
      channel._emitMessage(data);
    });

    // Some environments can fail to surface peer presence reliably.
    // Treat any probe traffic as readiness as well (probe runs on a separate action name).
    onProbe((_msg: string, peerId: string) => {
      debugLog("[DM] Probe received", { peerId: redact(peerId) });
      sawPeerTraffic = true;
      markPeerAvailable();
    });

    const peerCount = () => {
      try {
        const peers = room.getPeers?.() || {};
        return Object.keys(peers).length;
      } catch {
        return 0;
      }
    };

    const settle = () => {
      if (settled) return;
      if (peerCount() <= 0 && !sawPeerTraffic) return;
      settled = true;
      window.clearTimeout(timer);
      opts.abortSignal?.removeEventListener("abort", abortHandler);
      cleanupTimers();
      channel._setOpen();
      resolve(channel as unknown as RTCDataChannel);
    };

    function markPeerAvailable() {
      if (!settled || !peerUnavailable) return;
      peerUnavailable = false;
      if (peerReconnectTimer !== null) {
        window.clearTimeout(peerReconnectTimer);
        peerReconnectTimer = null;
      }
      channel._setOpen();
      opts.onPeerAvailable?.();
    }

    // Periodically send a lightweight probe so that whichever side connects first can
    // still detect readiness via traffic (avoids relying solely on peer presence events).
    const sendProbeSafe = () => {
      try {
        const result = sendProbe("ping");
        void Promise.resolve(result).catch(() => {
          // ignore probes that race peer setup
        });
      } catch {
        // ignore
      }
    };
    probeTimer = window.setInterval(sendProbeSafe, 1_250);
    window.setTimeout(sendProbeSafe, 0);

    // If we join and there is already a peer, resolve without waiting for onPeerJoin
    // (Trystero may not emit peer-join for already-present peers).
    poll = window.setInterval(() => settle(), 250);
    window.setTimeout(() => settle(), 0);

    room.onPeerJoin((peerId: string) => {
      debugLog("[DM] Peer joined:", redact(peerId));
      if (settled) markPeerAvailable();
      else settle();
    });

    room.onPeerLeave((peerId: string) => {
      debugLog("[DM] Peer left:", redact(peerId));
      if (!settled || peerCount() > 0 || peerUnavailable) return;

      // A browser refresh replaces the remote WebRTC peer. Keep this exact
      // signaling room alive briefly so the new peer can rejoin without both
      // sides tearing down and racing to create replacement rooms.
      peerUnavailable = true;
      channel._setWaitingForPeer();
      opts.onPeerUnavailable?.();
      peerReconnectTimer = window.setTimeout(() => {
        peerReconnectTimer = null;
        if (peerUnavailable) channel.close();
      }, peerReconnectGraceMs);
    });
  });
}
