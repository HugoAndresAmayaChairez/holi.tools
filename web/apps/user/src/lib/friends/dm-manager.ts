/**
 * Owns the complete lifecycle of one encrypted direct-message session.
 * Pages render state and persist history; this class only handles transport,
 * encryption, reconnects, and chat protocol events.
 */

import {
  ChatManager,
  type ChatEvent,
  type ChatManagerOptions,
  type ChatMessage,
} from "../p2p/chat";
import { debugLog, debugWarn, redact } from "../debug";
import { connectFriendDmChannel } from "./p2p";
import { dmKeyBytes, type FriendDmConfig } from "./dm";

export type DmState =
  | "idle"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "error";

export type DmEvent =
  | {
      type: "status_change";
      state: DmState;
      message?: string;
      attempt?: number;
      retryInMs?: number;
    }
  | { type: "chat_event"; event: ChatEvent };

type DmEventHandler = (event: DmEvent) => void;

export type DmManagerOptions = {
  dm: FriendDmConfig;
  isInitiator?: boolean;
  connectTimeoutMs?: number;
  peerReconnectGraceMs?: number;
  maxReconnectAttempts?: number;
  onIncomingFileOffer?: ChatManagerOptions["onIncomingFileOffer"];
  maxAutoAcceptBytes?: number;
};

export class DmManager {
  private readonly dm: FriendDmConfig;
  private readonly isInitiator: boolean;
  private readonly connectTimeoutMs: number;
  private readonly peerReconnectGraceMs: number;
  private readonly maxReconnectAttempts: number;
  private readonly chatOptions: Pick<
    ChatManagerOptions,
    "maxAutoAcceptBytes" | "onIncomingFileOffer"
  >;
  private listeners: DmEventHandler[] = [];

  public chatManager: ChatManager | null = null;
  public state: DmState = "idle";

  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempt = 0;
  private reconnectToken = 0;
  private connectAbortController: AbortController | null = null;
  private chatUnsub: (() => void) | null = null;
  private destroyed = false;

  constructor(options: DmManagerOptions) {
    this.dm = options.dm;
    this.isInitiator = options.isInitiator ?? false;
    this.connectTimeoutMs = options.connectTimeoutMs ?? 45_000;
    this.peerReconnectGraceMs = options.peerReconnectGraceMs ?? 20_000;
    this.maxReconnectAttempts = options.maxReconnectAttempts ?? 5;
    this.chatOptions = {
      maxAutoAcceptBytes: options.maxAutoAcceptBytes,
      onIncomingFileOffer: options.onIncomingFileOffer,
    };
  }

  public on(handler: DmEventHandler): () => void {
    this.listeners.push(handler);
    return () => {
      this.listeners = this.listeners.filter((item) => item !== handler);
    };
  }

  public async start(): Promise<void> {
    if (
      this.destroyed ||
      this.state === "connected" ||
      this.connectAbortController
    ) {
      return;
    }

    debugLog("[DmManager] Starting", { initiator: this.isInitiator });
    this.reconnectAttempt = 0;
    this.clearReconnectTimer();
    await this.connect();
  }

  public retry(): void {
    if (this.destroyed) return;

    debugLog("[DmManager] Manual retry requested");
    this.reconnectAttempt = 0;
    this.clearReconnectTimer();
    this.abortConnection();
    this.teardownChat();
    void this.connect();
  }

  public async sendText(text: string): Promise<ChatMessage> {
    if (!this.chatManager || this.state !== "connected") {
      throw new Error("Connection is not ready");
    }
    return this.chatManager.sendText(text);
  }

  public async sendFile(file: File): Promise<ChatMessage> {
    if (!this.chatManager || this.state !== "connected") {
      throw new Error("Connection is not ready");
    }
    return this.chatManager.sendFile(file);
  }

  public destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.reconnectToken += 1;
    this.clearReconnectTimer();
    this.abortConnection();
    this.teardownChat();
    this.state = "idle";
    this.listeners = [];
  }

  private emit(event: DmEvent): void {
    if (this.destroyed) return;
    if (event.type === "status_change") this.state = event.state;
    for (const handler of [...this.listeners]) handler(event);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer === null) return;
    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
  }

  private abortConnection(): void {
    const controller = this.connectAbortController;
    this.connectAbortController = null;
    if (controller && !controller.signal.aborted) controller.abort();
  }

  private teardownChat(): void {
    if (this.chatUnsub) {
      try {
        this.chatUnsub();
      } catch {
        // ignore listener cleanup failures
      }
      this.chatUnsub = null;
    }

    if (this.chatManager) {
      try {
        this.chatManager.close();
      } catch {
        // ignore transport cleanup failures
      }
      this.chatManager = null;
    }
  }

  private async connect(): Promise<void> {
    if (this.destroyed) return;

    this.clearReconnectTimer();
    this.abortConnection();

    const controller = new AbortController();
    this.connectAbortController = controller;
    const token = ++this.reconnectToken;
    const state: DmState =
      this.reconnectAttempt === 0 ? "connecting" : "reconnecting";
    this.emit({
      type: "status_change",
      state,
      attempt: this.reconnectAttempt + 1,
    });

    try {
      const channel = await connectFriendDmChannel({
        dm: this.dm,
        isInitiator: this.isInitiator,
        timeoutMs: this.connectTimeoutMs,
        peerReconnectGraceMs: this.peerReconnectGraceMs,
        abortSignal: controller.signal,
        onPeerUnavailable: () => this.handlePeerUnavailable(token),
        onPeerAvailable: () => this.handlePeerAvailable(token),
      });

      if (
        this.destroyed ||
        controller.signal.aborted ||
        token !== this.reconnectToken
      ) {
        channel.close();
        return;
      }

      debugLog("[DmManager] Connected", { channel: redact(channel.label) });
      this.initChat(channel);
    } catch (error) {
      if (
        this.destroyed ||
        controller.signal.aborted ||
        token !== this.reconnectToken
      ) {
        return;
      }

      const message = error instanceof Error ? error.message : String(error);
      debugWarn("[DmManager] Connection failed", message);

      if (this.reconnectAttempt < this.maxReconnectAttempts) {
        this.scheduleReconnect();
      } else {
        this.emit({ type: "status_change", state: "error", message });
      }
    } finally {
      if (this.connectAbortController === controller) {
        this.connectAbortController = null;
      }
    }
  }

  private scheduleReconnect(options?: { immediate?: boolean }): void {
    if (this.destroyed) return;

    this.clearReconnectTimer();
    this.reconnectAttempt += 1;

    const baseDelay = Math.min(
      20_000,
      1_500 * Math.pow(1.6, this.reconnectAttempt - 1)
    );
    const retryInMs = options?.immediate
      ? 0
      : Math.round(baseDelay + Math.random() * 750);

    this.emit({
      type: "status_change",
      state: "reconnecting",
      attempt: this.reconnectAttempt + 1,
      retryInMs,
    });

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      void this.connect();
    }, retryInMs);
  }

  private initChat(channel: RTCDataChannel): void {
    this.teardownChat();

    this.chatManager = new ChatManager(channel, {
      ...this.chatOptions,
      sessionKeyBytes: dmKeyBytes(this.dm.keyB64Url),
    });
    this.chatManager.startHeartbeat({ intervalMs: 5_000, timeoutMs: 20_000 });

    this.chatUnsub = this.chatManager.on((event) => {
      this.emit({ type: "chat_event", event });
      if (event.type === "disconnected") this.handleDisconnect();
    });

    this.reconnectAttempt = 0;
    this.emit({ type: "status_change", state: "connected" });
  }

  private handleDisconnect(): void {
    if (this.destroyed) return;

    debugLog("[DmManager] Connection lost");
    this.teardownChat();

    if (this.reconnectAttempt < this.maxReconnectAttempts) {
      this.scheduleReconnect({ immediate: true });
    } else {
      this.emit({ type: "status_change", state: "error" });
    }
  }

  private handlePeerUnavailable(token: number): void {
    if (
      this.destroyed ||
      token !== this.reconnectToken ||
      !this.chatManager
    ) {
      return;
    }

    this.emit({
      type: "status_change",
      state: "reconnecting",
      attempt: 1,
      retryInMs: this.peerReconnectGraceMs,
    });
  }

  private handlePeerAvailable(token: number): void {
    if (
      this.destroyed ||
      token !== this.reconnectToken ||
      !this.chatManager
    ) {
      return;
    }

    this.chatManager.noteTransportRestored();
    this.emit({ type: "status_change", state: "connected" });
  }
}
