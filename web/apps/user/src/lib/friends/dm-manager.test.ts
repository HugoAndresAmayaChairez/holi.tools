import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  connect: vi.fn(),
  chatOptions: [] as unknown[],
  chatHandlers: [] as Array<(event: unknown) => void>,
  closeCount: 0,
}));

vi.mock("./p2p", () => ({
  connectFriendDmChannel: mocks.connect,
}));

vi.mock("../p2p/chat", () => ({
  ChatManager: class MockChatManager {
    constructor(_channel: unknown, options: unknown) {
      mocks.chatOptions.push(options);
    }

    startHeartbeat() {}

    noteTransportRestored() {}

    on(handler: (event: unknown) => void) {
      mocks.chatHandlers.push(handler);
      return () => {
        mocks.chatHandlers = mocks.chatHandlers.filter(
          (item) => item !== handler
        );
      };
    }

    close() {
      mocks.closeCount += 1;
    }

    async sendText(content: string) {
      return {
        type: "text",
        id: "outgoing-id",
        senderId: "me",
        content,
        timestamp: 1,
      };
    }

    async sendFile(file: File) {
      return {
        type: "file-start",
        id: "file-id",
        senderId: "me",
        filename: file.name,
        mimeType: file.type,
        size: file.size,
        timestamp: 1,
      };
    }
  },
}));

import { DmManager } from "./dm-manager";

const dm = {
  sessionId: "session-id",
  keyB64Url: "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
};

const channel = {
  label: "test-channel",
  close: vi.fn(),
} as unknown as RTCDataChannel;

describe("DmManager", () => {
  beforeEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    mocks.chatOptions = [];
    mocks.chatHandlers = [];
    mocks.closeCount = 0;
  });

  it("uses one encrypted chat protocol for the connected channel", async () => {
    mocks.connect.mockResolvedValue(channel);
    const manager = new DmManager({ dm });

    await manager.start();

    expect(manager.state).toBe("connected");
    expect(mocks.chatOptions).toHaveLength(1);
    expect((mocks.chatOptions[0] as any).sessionKeyBytes).toHaveLength(32);
    await expect(manager.sendText("hello")).resolves.toMatchObject({
      content: "hello",
      senderId: "me",
    });
  });

  it("aborts an unfinished connection when destroyed", async () => {
    let capturedSignal: AbortSignal | undefined;
    mocks.connect.mockImplementation(
      ({ abortSignal }: { abortSignal: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          capturedSignal = abortSignal;
          abortSignal.addEventListener("abort", () =>
            reject(new Error("Aborted"))
          );
        })
    );

    const manager = new DmManager({ dm });
    const started = manager.start();
    await Promise.resolve();
    manager.destroy();
    await started;

    expect(capturedSignal?.aborted).toBe(true);
    expect(manager.state).toBe("idle");
  });

  it("reconnects after a channel disconnect without duplicating managers", async () => {
    vi.useFakeTimers();
    mocks.connect.mockResolvedValue(channel);
    const manager = new DmManager({ dm });

    await manager.start();
    const disconnect = mocks.chatHandlers[0];
    expect(disconnect).toBeTypeOf("function");
    disconnect?.({ type: "disconnected" });
    await vi.runAllTimersAsync();

    expect(mocks.connect).toHaveBeenCalledTimes(2);
    expect(manager.state).toBe("connected");
    expect(mocks.chatOptions).toHaveLength(2);
  });

  it("pauses sending while one peer refreshes and resumes in the same room", async () => {
    let connectOptions: any;
    mocks.connect.mockImplementation(async (options: any) => {
      connectOptions = options;
      return channel;
    });
    const manager = new DmManager({ dm, peerReconnectGraceMs: 20_000 });

    await manager.start();
    connectOptions.onPeerUnavailable();

    expect(manager.state).toBe("reconnecting");
    await expect(manager.sendText("too soon")).rejects.toThrow(
      "Connection is not ready"
    );

    connectOptions.onPeerAvailable();
    expect(manager.state).toBe("connected");
    expect(mocks.chatOptions).toHaveLength(1);
  });
});
