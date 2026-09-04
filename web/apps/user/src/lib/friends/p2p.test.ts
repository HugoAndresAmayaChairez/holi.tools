import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";

const mocks = vi.hoisted(() => ({
  joinRoom: vi.fn(),
  sendFrame: vi.fn().mockResolvedValue(undefined),
  sendProbe: vi.fn().mockResolvedValue(undefined),
  frameReceiver: null as null | ((data: unknown, peerId: string) => void),
  probeReceiver: null as null | ((data: string, peerId: string) => void),
  peerJoin: null as null | ((peerId: string) => void),
  peerLeave: null as null | ((peerId: string) => void),
  leave: vi.fn(),
  peers: {} as Record<string, unknown>,
}));

vi.mock("../p2p/trystero-client", () => ({
  joinTrysteroRoom: mocks.joinRoom,
}));

vi.mock("../debug", () => ({
  debugLog: vi.fn(),
  debugWarn: vi.fn(),
  redact: vi.fn((value) => value),
}));

import { connectFriendDmChannel } from "./p2p";

const dm = {
  sessionId: "session-id",
  keyB64Url: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
};

describe("connectFriendDmChannel", () => {
  beforeAll(() => {
    vi.stubGlobal("window", globalThis);
  });

  afterAll(() => {
    vi.unstubAllGlobals();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.frameReceiver = null;
    mocks.probeReceiver = null;
    mocks.peerJoin = null;
    mocks.peerLeave = null;
    mocks.peers = {};

    mocks.joinRoom.mockReturnValue({
      makeAction(name: string) {
        if (name === "dm-frame") {
          return [
            mocks.sendFrame,
            (handler: typeof mocks.frameReceiver) => {
              mocks.frameReceiver = handler;
            },
          ];
        }
        return [
          mocks.sendProbe,
          (handler: typeof mocks.probeReceiver) => {
            mocks.probeReceiver = handler;
          },
        ];
      },
      onPeerJoin(handler: (peerId: string) => void) {
        mocks.peerJoin = handler;
      },
      onPeerLeave(handler: (peerId: string) => void) {
        mocks.peerLeave = handler;
      },
      getPeers() {
        return mocks.peers;
      },
      leave: mocks.leave,
    });
  });

  it("queues a frame that arrives before ChatManager attaches onmessage", async () => {
    const connecting = connectFriendDmChannel({
      dm,
      isInitiator: false,
      timeoutMs: 1_000,
    });

    mocks.frameReceiver?.(new Uint8Array([1, 2, 3]), "peer-a");
    mocks.peerJoin?.("peer-a");
    const channel = await connecting;
    const onMessage = vi.fn();

    channel.onmessage = onMessage;

    expect(onMessage).toHaveBeenCalledOnce();
    expect(
      Array.from(new Uint8Array(onMessage.mock.calls[0]![0].data))
    ).toEqual([1, 2, 3]);
    expect(mocks.joinRoom).toHaveBeenCalledWith(
      { appId: "holi-dm-v1", password: dm.keyB64Url },
      `dm-${dm.sessionId}`,
      expect.any(Object)
    );
    channel.close();
  });

  it("leaves the room when an unfinished attempt is aborted", async () => {
    const controller = new AbortController();
    const connecting = connectFriendDmChannel({
      dm,
      isInitiator: true,
      timeoutMs: 1_000,
      abortSignal: controller.signal,
    });

    controller.abort();

    await expect(connecting).rejects.toThrow("Aborted");
    expect(mocks.leave).toHaveBeenCalledOnce();
  });

  it("keeps the room alive while a refreshed peer rejoins", async () => {
    vi.useFakeTimers();
    const onPeerUnavailable = vi.fn();
    const onPeerAvailable = vi.fn();
    mocks.peers = { "peer-a": {} };

    const connecting = connectFriendDmChannel({
      dm,
      isInitiator: false,
      timeoutMs: 1_000,
      peerReconnectGraceMs: 50,
      onPeerUnavailable,
      onPeerAvailable,
    });
    mocks.peerJoin?.("peer-a");
    const channel = await connecting;

    mocks.peers = {};
    mocks.peerLeave?.("peer-a");
    expect(channel.readyState).toBe("connecting");
    expect(onPeerUnavailable).toHaveBeenCalledOnce();
    expect(mocks.leave).not.toHaveBeenCalled();

    mocks.peers = { "peer-b": {} };
    mocks.peerJoin?.("peer-b");
    expect(channel.readyState).toBe("open");
    expect(onPeerAvailable).toHaveBeenCalledOnce();

    await vi.advanceTimersByTimeAsync(60);
    expect(mocks.leave).not.toHaveBeenCalled();
    channel.close();
    vi.useRealTimers();
  });

  it("closes an abandoned room after the refresh grace period", async () => {
    vi.useFakeTimers();
    mocks.peers = { "peer-a": {} };

    const connecting = connectFriendDmChannel({
      dm,
      isInitiator: false,
      timeoutMs: 1_000,
      peerReconnectGraceMs: 50,
    });
    mocks.peerJoin?.("peer-a");
    const channel = await connecting;

    mocks.peers = {};
    mocks.peerLeave?.("peer-a");
    await vi.advanceTimersByTimeAsync(50);

    expect(channel.readyState).toBe("closed");
    expect(mocks.leave).toHaveBeenCalledOnce();
    vi.useRealTimers();
  });
});
