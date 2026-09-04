# holi-user environment settings

All settings are optional. Production normally uses Trystero's maintained Nostr relay pool and Holi's default public STUN servers.

## Debug logging

- `PUBLIC_HOLI_DEBUG=1` enables redacted diagnostic logs.
- Default: disabled.

Never add secrets, capability links, room IDs, message bodies, or raw signaling events to debug output.

## Nostr signaling

- `PUBLIC_HOLI_NOSTR_RELAYS` is a comma-separated list of `wss://` relay URLs.
- `PUBLIC_HOLI_NOSTR_RELAY_REDUNDANCY` selects between 1 and 8 relays when the default pool is used.

Runtime diagnostic equivalents:

- `localStorage["holi:nostrRelays"]`
- `localStorage["holi:nostrRelayRedundancy"]`

An explicit relay list disables Trystero's maintained default selection, so it should only be used for controlled testing or an intentional deployment policy.

## WebRTC ICE and TURN

- `PUBLIC_HOLI_ICE_SERVERS` accepts a JSON array of `RTCIceServer` objects.
- `PUBLIC_HOLI_ICE_TRANSPORT_POLICY` accepts `all` or `relay`.

Runtime diagnostic equivalents:

- `localStorage["holi:iceServers"]`
- `localStorage["holi:iceTransportPolicy"]`

Use `relay` only when a working TURN server is included. Public STUN alone cannot connect every restrictive NAT or enterprise network.

## Encryption behavior

There is no production switch that disables DM encryption. Friend DMs and link-based private chats always use their 32-byte shared key for both password-protected Trystero signaling and Holi's application-layer encrypted frames.
