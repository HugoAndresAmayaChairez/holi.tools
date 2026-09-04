# Privacy model

## Default promise

Holi processes files and documents on the device for core tool workflows. A
local tool does not send document content merely because its page was opened.
This does not make the connection anonymous: Cloudflare can process technical
metadata such as IP address, time, requested path, traffic volume, and routing
information while serving a page.

Every public product renders an expandable privacy summary close to its working
surface. The summary follows `spec/privacy-summary-v1.md` and describes current
behavior, not roadmap intent.

## Required data-flow review

```text
input -> memory -> persistent storage -> network -> provider -> recipient
```

For each step, record whether it occurs, who initiates it, what data is present,
how long it remains, and how the person can remove or revoke it.

## Local tools

The QR, Metadata, and Typst core workflows run in the browser. They disclose
processing location, storage, uploads, optional external actions, and the
connection metadata visible to the host. Avoid global claims such as “serverless”,
“anonymous”, “zero knowledge”, or “100% offline”.

## Identity and collaboration

- Identity, contacts, and project files remain local by default.
- A contact is an alias for a verified public capability, not a global social
  graph owned by Holi.
- Collaboration is explicitly activated per project or conversation.
- Direct WebRTC can expose peer network addresses. A TURN relay can hide peer
  addresses from one another while remaining able to observe transport metadata.
- Signaling and relay providers may observe IP, timing, room activity, traffic
  volume, and routing metadata even when content is encrypted.
- End-to-end encryption is claimed only when no intermediary receives the
  content key. Current project transport must not be described as having an
  extra application-layer envelope until that implementation ships.

Do not log content, filenames, capabilities, room keys, contact identifiers,
message bodies, or raw signaling payloads. Retention and deletion windows must
be defined before introducing server-side room state.

## Third parties and donations

Opening a donation, repository, or support destination is an explicit external
navigation governed by that provider. The UI should identify the destination
before navigation. Holi must not imply that third-party sites inherit Holi's
local processing guarantees.
