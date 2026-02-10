/**
 * Friend DM P2P Connection via Trystero
 * 
 * Simplified approach using Trystero WebRTC rooms instead of manual signaling.
 */
import { joinTrysteroRoom } from '../p2p/trystero-client';
import { debugLog, redact } from '../debug';

export type FriendDmConfig = {
  sessionId: string;
  keyB64Url: string; // Still used as part of room ID for uniqueness
};

const DM_APP_ID = 'holi-dm-v1';

type DmRoom = {
  sendMessage: (msg: string) => void;
  onMessage: (handler: (msg: string, peerId: string) => void) => void;
  onPeerJoin: (handler: (peerId: string) => void) => void;
  onPeerLeave: (handler: (peerId: string) => void) => void;
  leave: () => void;
  getPeers: () => string[];
};

/**
 * Connect to a friend's DM channel using Trystero.
 * Both parties call this with the same FriendDmConfig to join the same room.
 */
export function connectFriendDmRoom(opts: {
  dm: FriendDmConfig;
  onMessage: (msg: string, peerId: string) => void;
  onPeerJoin?: (peerId: string) => void;
  onPeerLeave?: (peerId: string) => void;
}): DmRoom {
  // Room ID is derived from sessionId (already unique per friend pair)
  const roomId = `dm-${opts.dm.sessionId}`;

  debugLog('[DM] Connecting');

  const room = joinTrysteroRoom({ appId: DM_APP_ID }, roomId);

  // Create actions for messaging
  const [sendMessage, onMessage] = room.makeAction<string>('dm-msg');

  // Wire up message handler
  onMessage((msg, peerId) => {
    opts.onMessage(msg, peerId);
  });

  // Wire up peer events
  room.onPeerJoin((peerId) => {
    debugLog('[DM] Peer joined:', redact(peerId));
    opts.onPeerJoin?.(peerId);
  });

  room.onPeerLeave((peerId) => {
    debugLog('[DM] Peer left:', redact(peerId));
    opts.onPeerLeave?.(peerId);
  });

  return {
    sendMessage: (msg: string) => {
      sendMessage(msg);
    },
    onMessage: (handler) => {
      onMessage((msg, peerId) => handler(msg, peerId));
    },
    onPeerJoin: (handler) => {
      room.onPeerJoin(handler);
    },
    onPeerLeave: (handler) => {
      room.onPeerLeave(handler);
    },
    leave: () => {
      debugLog('[DM] Leaving');
      room.leave();
    },
    getPeers: () => Object.keys(room.getPeers())
  };
}

// Legacy export for backwards compatibility during migration
// This can be removed once all usages are updated
export async function connectFriendDmChannel(opts: {
  dm: FriendDmConfig;
  isInitiator: boolean;
  timeoutMs?: number;
  abortSignal?: AbortSignal;
}): Promise<{ send: (msg: string) => void; onMessage: (handler: (msg: string) => void) => void; close: () => void }> {
  const timeoutMs = opts.timeoutMs ?? 60_000;

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      room.leave();
      reject(new Error('DM connection timed out'));
    }, timeoutMs);

    let messageHandler: ((msg: string) => void) | null = null;

    const room = connectFriendDmRoom({
      dm: opts.dm,
      onMessage: (msg) => {
        if (messageHandler) messageHandler(msg);
      },
      onPeerJoin: () => {
        // Connected!
        clearTimeout(timer);
        resolve({
          send: (msg: string) => room.sendMessage(msg),
          onMessage: (handler) => { messageHandler = handler; },
          close: () => room.leave()
        });
      }
    });

    opts.abortSignal?.addEventListener('abort', () => {
      clearTimeout(timer);
      room.leave();
      reject(new Error('Aborted'));
    });
  });
}
