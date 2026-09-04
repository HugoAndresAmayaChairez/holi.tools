import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("trystero", () => ({
  joinRoom: vi.fn(),
}));

import { joinRoom } from "trystero";
import { joinTrysteroRoom } from "./trystero-client";

describe("joinTrysteroRoom compatibility adapter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("maps legacy actions and peer listeners to Trystero 0.25", async () => {
    const nativeAction = {
      send: vi.fn().mockResolvedValue(undefined),
      onMessage: null as null | ((data: unknown, context: any) => unknown),
      onReceiveProgress: null as
        | null
        | ((progress: number, context: any) => unknown),
    };
    const nativeRoom = {
      makeAction: vi.fn(() => nativeAction),
      getPeers: vi.fn(() => ({ existing: {} })),
      leave: vi.fn().mockResolvedValue(undefined),
      onPeerJoin: null as null | ((peerId: string) => void),
      onPeerLeave: null as null | ((peerId: string) => void),
    };
    vi.mocked(joinRoom).mockReturnValue(nativeRoom as any);

    const onJoinError = vi.fn();
    const room = joinTrysteroRoom(
      { appId: "holi-test", password: "shared-secret" },
      "room-id",
      { onJoinError }
    );

    expect(joinRoom).toHaveBeenCalledWith(
      expect.objectContaining({
        appId: "holi-test",
        password: "shared-secret",
        rtcConfig: expect.objectContaining({ iceServers: expect.any(Array) }),
      }),
      "room-id",
      { onJoinError }
    );

    const [send, onMessage, onProgress] = room.makeAction<string>("chat");
    const messageHandler = vi.fn();
    const progressHandler = vi.fn();
    onMessage(messageHandler);
    onProgress(progressHandler);

    await nativeAction.onMessage?.("hello", {
      peerId: "peer-a",
      metadata: { kind: "text" },
    });
    nativeAction.onReceiveProgress?.(0.5, {
      peerId: "peer-a",
      metadata: { name: "file.txt" },
    });
    await send("outgoing", null, { kind: "text" });

    expect(messageHandler).toHaveBeenCalledWith("hello", "peer-a", {
      kind: "text",
    });
    expect(progressHandler).toHaveBeenCalledWith(0.5, "peer-a", {
      name: "file.txt",
    });
    expect(nativeAction.send).toHaveBeenCalledWith("outgoing", {
      target: null,
      metadata: { kind: "text" },
    });

    const joined = vi.fn();
    const left = vi.fn();
    room.onPeerJoin(joined);
    room.onPeerLeave(left);
    expect(joined).toHaveBeenCalledWith("existing");

    nativeRoom.onPeerJoin?.("peer-b");
    nativeRoom.onPeerLeave?.("peer-b");
    expect(joined).toHaveBeenCalledWith("peer-b");
    expect(left).toHaveBeenCalledWith("peer-b");

    room.leave();
    expect(nativeRoom.leave).toHaveBeenCalledOnce();
  });
});
