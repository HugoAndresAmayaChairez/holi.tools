# Holi P2P architecture

## Direct-message path

```mermaid
sequenceDiagram
  participant A as Peer A
  participant B as Peer B
  participant R as Nostr relays
  participant D as DmManager
  A->>R: Trystero encrypted signaling announcement
  B->>R: Trystero encrypted signaling announcement
  R-->>A: Peer B signaling
  R-->>B: Peer A signaling
  A->>B: WebRTC connection established
  B->>A: WebRTC connection established
  D->>D: Create ChatManager with shared 32-byte key
  A->>B: AEAD-wrapped messages, files, and heartbeats
  B->>A: AEAD-wrapped messages, files, and heartbeats
```

Nostr is discovery and signaling only. It does not carry application messages or files.

## Responsibilities

| Module                  | Responsibility                                                               |
| ----------------------- | ---------------------------------------------------------------------------- |
| `trystero-client.ts`    | Adapts the current Trystero API and applies explicit relay/ICE overrides.    |
| `friends/p2p.ts`        | Exposes Trystero actions as the channel surface used by the binary protocol. |
| `friends/dm-manager.ts` | Owns connect, cancel, retry, heartbeat lifecycle, and cleanup.               |
| `p2p/chat.ts`           | Owns ordered binary framing, application encryption, and file transfer.      |
| `/dm` and `/private`    | Render state and decide how history/files are persisted.                     |

## State transitions

```mermaid
stateDiagram-v2
  [*] --> idle
  idle --> connecting: start
  connecting --> connected: peer discovered
  connecting --> reconnecting: timeout
  connected --> reconnecting: peer leaves / heartbeat fails
  reconnecting --> connected: peer returns
  reconnecting --> error: retry budget exhausted
  error --> connecting: manual retry
  connected --> idle: page cleanup
  connecting --> idle: page cleanup cancels attempt
```

## Project path

Project collaboration is separate because it is multi-peer and synchronizes manifests, metadata, and files. Its capability secret derives the room and protects Trystero signaling. Payloads travel over WebRTC's encrypted transport; they do not yet use the DM application envelope.
