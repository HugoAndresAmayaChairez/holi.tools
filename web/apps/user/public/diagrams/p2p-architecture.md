# Holi P2P Architecture: Identity, Friends & Chat

This document visualizes how the Holi "Sovereign Identity" and P2P Chat system works, including the robust reconnection logic.

## 1. High-Level Architecture

```mermaid
graph TD
    User[User (Browser)]
    
    subgraph Local["Local Device (FileSystem)"]
        Identity[".holi/identity.json<br/>(Nostr Keys)"]
        Contacts["contacts.json<br/>(Friends List)"]
    end
    
    subgraph Signaling["Signaling Layer (Nostr)"]
        Relay["Nostr Relay<br/>(wss://relay.snort.social)"]
        Inbox["Discovery Inbox<br/>(Ephemeral Keys)"]
    end
    
    subgraph P2P["P2P Connection (WebRTC)"]
        DM_Manager["DmManager"]
        P2P_Lib["p2p.ts"]
        Chat["ChatManager"]
        Protocol["Binary Protocol<br/>(Encrypted V1)"]
    end
    
    User --> Identity
    User --> Contacts
    
    Identity -->|Sign Events| DM_Manager
    DM_Manager -->|Publish Offer/Answer| Relay
    RELAY_MSG[Peer Signaling] .-> Relay
    
    DM_Manager -->|Manage| P2P_Lib
    P2P_Lib -->|Create Channel| Chat
    Chat -->|Send/Recv| Protocol
```

## 2. Robust Reconnection Flow (Sequence Diagram)

This detailed sequence shows how we solved the "Race Condition" and "Ghost Connection" issues using AbortControllers, Jitter, and Timestamp Filtering.

```mermaid
sequenceDiagram
    participant A as Peer A (Initiator)
    participant B as Peer B (Responder)
    participant N as Nostr Relay

    Note over A,B: Initial State: Disconnected

    %% --- Connection Start ---
    A->>A: reload / start()
    A->>A: Abort previous attempts
    A->>A: Wait Random Jitter (0-2s)
    
    A->>N: Publish OFFER (ts: t1)
    A->>N: Loop: Publish OFFER (ts: now) every 3s
    
    B->>B: reload / start()
    B->>B: Abort previous attempts
    B->>B: Wait Random Jitter (0-2s)
    
    B->>N: Subscribe to signals
    N-->>B: Receive OFFER (ts: t1)
    
    B->>B: Check: ts > minTs (Start Time)?
    alt Offer is Fresh
        B->>B: Accept Offer
        B->>N: Publish ANSWER (ts: t2)
    else Offer is Stale
        B->>B: Ignore
    end

    %% --- Connection Established ---
    N-->>A: Receive ANSWER (ts: t2)
    A->>A: Check: ts > connectStartMs?
    A->>A: Stop Republishing Loop
    
    A<->B: WebRTC Handshake (ICE)
    A-->>B: DATA CHANNEL OPEN
    
    B->>N: Republish ANSWER (retry x2)
    Note right of B: Safety net for packet loss

    %% --- Chat Session ---
    A->>B: Encrypted Heartbeat
    B->>A: Encrypted Heartbeat
```

## 3. Component Responsibility

| Component | Responsibility | Key Logic |
|-----------|----------------|-----------|
| **DmManager** | Orchestration | Manages lifecycle, Retry Loop, `AbortController`, UI Status updates. |
| **p2p.ts** | WebRTC & Signaling | Handles `RTCPeerConnection`, ICE, Signal Encryption (wasm), Timestamp Filtering (`minTsMs`). |
| **ChatManager** | Protocol & Data | Encrypts/Decrypts chunks (V1), Handles File Transfers, Binary Framing. |
| **Nostr** | Dumb Pipe | Just relays encrypted JSON blobs. No logic execution. |
