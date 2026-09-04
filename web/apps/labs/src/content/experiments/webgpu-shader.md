---
title: "When a WebGPU background is worth the cost"
description: "A progressive-enhancement checklist for visual effects that never block the product workflow."
summary: "Use WebGPU only when the effect has measured value, starts after useful content, respects reduced motion, and has a quiet CSS fallback."
tags: ["webgpu", "graphics", "shader"]
category: "Graphics"
format: "field-note"
icon: "animation"
color: "var(--palette-labs-accent)"
lang: en
order: 40
---

A shader can create identity, but it also competes with content for battery, GPU time, bundle weight, and attention. Treat it as optional decoration.

## Load useful content first

Render the page before requesting an adapter or downloading a graphics runtime. Start the effect during idle time and stop it when the page is hidden.

## Respect the device and person

- Disable animation for `prefers-reduced-motion`.
- Lower resolution on constrained displays.
- Pause outside the viewport.
- Keep text contrast independent from moving pixels.

## Provide a complete fallback

A simple CSS color or gradient should preserve the product identity without WebGPU. Unsupported hardware, blocked initialization, or a lost device must not create a blank page.

## Measure before keeping it

Record startup cost, transferred bytes, frame time, power impact, and layout stability. If the effect does not improve comprehension or product recognition enough to justify those costs, remove it.
