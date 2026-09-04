---
title: "Design a QR code that still scans"
description: "A visual checklist for contrast, quiet zone, error correction, logos, and export verification."
summary: "Treat decoration as a constrained layer around a machine-readable symbol, then verify the exported result—not only the editor preview."
tags: ["qr", "accessibility", "testing"]
category: "QR"
format: "tutorial"
icon: "qr_code_2"
color: "var(--palette-qr-accent)"
lang: en
order: 2
---

A QR code can look impressive in the editor and fail on a printed menu, a dim phone, or a compressed social image. Good customization protects the parts a scanner needs.

## Begin with contrast

The modules should be clearly darker than their background. Avoid using transparency to create essential contrast because the final surface may be unknown. A preview over a checkerboard is not evidence that the exported image will work on a poster.

## Preserve the quiet zone

Keep an empty margin around the complete code. Decorative frames, captions, and backgrounds should live outside that zone. Cropping tightly is one of the fastest ways to make an otherwise valid QR unreliable.

## Choose error correction deliberately

Higher error correction can tolerate more damage or a small centered logo, but it also makes the symbol denser. Start with the lowest level that fits the use case and increase it only when the design needs the additional resilience.

## Keep logos modest

A logo covers data modules even when it has a neat frame. Center it, keep it compact, and avoid covering the three finder patterns. If a design needs a large illustration, place it around the QR rather than inside it.

## Test the actual export

The exported PNG, SVG, or PDF is the artifact people scan. Verify it after every meaningful visual change:

1. Scan at the intended physical or on-screen size.
2. Try at least two scanner implementations.
3. Test bright and low light.
4. Test the exported file after resizing or compression.
5. Print a sample when print is the destination.

## Provide a safe editor

A QR tool should warn about low contrast, missing quiet zone, excessive logo coverage, or a failed self-scan. Warnings are more useful than silently preventing experimentation, but downloads should make the unresolved risk clear.

## Privacy check

Static QR generation can happen entirely in the browser. A QR can still contain sensitive data, so previews, recent values, and analytics events must not send the encoded text. If a dynamic QR or redirect service is introduced, it becomes a connected feature and needs a separate privacy explanation.
