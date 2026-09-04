---
title: "How to compare WASM and JavaScript fairly"
description: "A repeatable browser benchmark checklist that includes startup, transfer, memory, and user-visible latency."
summary: "A useful benchmark measures the complete shipping path and publishes its environment instead of presenting isolated loop times as product truth."
tags: ["benchmark", "wasm", "performance"]
category: "Performance"
format: "experiment"
icon: "speed"
color: "var(--palette-paint-accent)"
lang: en
order: 30
---

A WASM implementation is not automatically faster than JavaScript. The result depends on workload size, data conversion, compilation, caching, browser, and device.

## Define the user-visible question

Measure a real task such as “time from clicking Generate to a scannable QR preview.” Include loading and conversion work the user actually waits for.

## Record the environment

- Browser and exact version.
- Operating system and hardware.
- Cold and warm runs.
- Bundle size and WASM byte size.
- Sample inputs and iteration count.

## Report distributions

Use multiple runs and publish median plus a high percentile. Keep initialization separate, but do not hide it. If the result changes only in a synthetic loop and not in interaction latency, say so.

## Decide with product costs

Performance is one input. Also compare complexity, debugging, accessibility impact, deployment, browser fallback, and contributor experience. Keep WASM only when the complete tradeoff remains positive.
