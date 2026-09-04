# ADR 0002: Collaboration is an optional encrypted project session

Status: proposed — 2026-09-02

## Context

Local files provide strong ownership, but collaboration needs discovery,
signaling, presence, and temporary coordination. A Worker and Durable Object can
coordinate sessions, but infrastructure still observes connection metadata and
must not receive document keys or plaintext content.

## Decision

Keep editing independent from sessions. When collaboration ships, create an
explicit project session whose clients hold content keys. Infrastructure handles
encrypted, expiring envelopes and minimal presence. The UI labels direct and
relay transport separately and discloses provider-visible metadata.

## Required gates

- documented threat model and abuse model;
- application-layer encryption with tested key lifecycle and replay handling;
- fixed retention/deletion windows and bounded room state;
- runtime privacy label for direct, relay, reconnecting, and offline modes;
- no global friend list; contacts remain local verified aliases.

This decision does not authorize deploying collaboration infrastructure yet.
