# Roadmap

This is a priority map, not a promise of dates. Keep it short and move completed
work into release logs or decision records.

## Now

- Make Main, Typst, QR, and Metadata immediately understandable and useful.
- Show truthful privacy summaries and donation/support access across every
  public product.
- Keep versions, Shadow Logs, tests, and production deployments synchronized.
- Stabilize Typst's local editor, file recovery, PDF export, bundle loading, and
  mobile experience.
- Keep User's connection behavior clearly experimental and accurately labeled.

## Next

- Design an encrypted, expiring collaboration session for Typst without making
  remote state authoritative.
- Add browser tests for crypto/P2P WASM boundaries, reconnect, replay rejection,
  and invalid frames.
- Define direct-versus-relay runtime labels, retention limits, and a documented
  threat model before deploying shared room infrastructure.
- Move product-local Shadow Logs out of the shared configuration package when
  each app has a stable local release module.

## Later

- Decide whether User becomes a standalone public product or an internal set of
  collaboration packages based on actual adoption.
- Reconsider paused Rust renderers only when profiling a shipping web feature
  establishes a concrete need.
- Expand locales only after full-flow translation and RTL/overflow review.

## Not planned

- A Holi CLI or TUI product.
- A public Holi Rust library maintained independently from web consumers.
- Mandatory accounts, cloud ownership of local projects, or a global friend
  graph without a validated privacy model.
