# Spec: Privacy Summary V1

Status: active
Owner: `@holi/ui` and all public apps
Last updated: 2026-09-02

## Purpose

Give a person a truthful answer to “what happens to my data here?” without
requiring them to read a full privacy policy.

## Inputs

A product supplies:

- a short summary written for the current product mode;
- a list of privacy facts with `label`, `value`, and optional `tone`;
- an optional link to a detailed privacy or architecture document.

Allowed tones are `local`, `connected`, and `warning`. Tone is informational;
the text remains the source of truth.

## Output

The interface renders a compact disclosure followed by an expandable definition
list. It must work without JavaScript, must be keyboard accessible, and must not
make a network request.

## Invariants

1. The label describes implemented behavior, not roadmap intent.
2. “Local” means application content is processed on the device for that action;
   it does not mean the hosting provider sees no connection metadata.
3. “End-to-end encrypted” is used only if content is encrypted before transport
   and no intermediary receives the content key.
4. “Relay” means peers do not receive each other's network address; it does not
   hide the address from the relay provider.
5. A tool must update the visible summary when its privacy mode changes.
6. Product copy and the detailed privacy policy must not contradict the label.

## Required Facts For Local Tools

- Processing location.
- Persistent storage location.
- Whether opening or editing a file uploads it.
- Any external resources or optional network actions.

## Additional Facts For Connected Tools

- Transport mode: direct, relay, or server-mediated.
- Content encryption and key holder.
- Other participants who can access the content.
- Provider-visible technical metadata.
- Server retention and deletion window.

## Security And Privacy

The component receives static display facts and must never inspect document
contents. Do not place filenames, room keys, participant identifiers, or document
data in markup attributes, analytics events, or logs.

## Edge Cases

- If the browser falls back from direct to relay, update the connection fact.
- If a user chooses a cloud import/export, disclose it before the transfer.
- If a feature is unavailable offline, say “requires a connection”; do not call
  the whole product offline-only.
- If provider behavior is unknown, label it unknown rather than inferring a
  privacy guarantee.
