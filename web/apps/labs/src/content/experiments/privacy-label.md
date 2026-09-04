---
title: "Write a privacy label people can actually verify"
description: "Trace data from input to recipient and turn the result into a short, honest product summary."
summary: "A useful privacy label separates local content from connection metadata, names connected modes, and stays synchronized with implementation changes."
tags: ["privacy", "metadata", "product"]
category: "Privacy"
format: "tutorial"
icon: "shield-check"
color: "var(--palette-labs-accent)"
lang: en
order: 4
---

“Private” is too broad to be a useful product claim. A good label tells people what happens to their content, what the network provider can observe, and what changes when they enable a connected feature.

## Draw the complete flow

For every action, follow this sequence:

```text
input → memory → storage → network → provider → recipient
```

Record what exists at each stage, for how long, and why. Do this for the default local workflow and again for each connected mode.

## Separate content from metadata

If a document is processed in the browser, say that clearly. Do not turn it into the stronger claim that nobody can observe anything. The hosting provider can commonly receive IP address, request time, requested route, user agent, and traffic volume while serving the application.

The distinction should be visible:

- **Content:** document text, images, filenames, QR values.
- **Connection metadata:** IP address, timing, route, and request volume.
- **Collaboration metadata:** room identifiers, relay routing, peer addresses, and presence events, depending on the architecture.

## Label the active mode

Local editing, direct peer-to-peer collaboration, and relayed collaboration have different recipients and risks. Name the current mode in the interface instead of hiding the difference in a policy page.

## Avoid absolute promises

Prefer claims tied to behavior:

- “This document is processed in your browser.”
- “Opening a local file does not upload it.”
- “Cloudflare can process connection metadata while serving this page.”

Avoid “zero knowledge” or “no information is collected” unless every layer of the deployed system has been designed and verified for that exact property.

## Put the summary near the action

Show a compact label in the product shell, then link to details. Before a network boundary is crossed, provide a more specific disclosure and an explicit action. A policy page alone is too far from the decision.

## Keep it synchronized

Treat the label as a user-facing contract. A release that changes storage, analytics, collaboration, error reporting, or providers must update the flow and visible Shadow Log.

## Verification checklist

- Inspect requests during the complete workflow.
- Search logs and telemetry schemas for sensitive fields.
- Test local editing with the collaboration service unavailable.
- Confirm filenames and document bytes do not enter error reports.
- Make the provider and recipient explicit for every connected mode.
