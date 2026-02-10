---
title: "Performance Benchmarks"
description: "Benchmarking WASM against native JavaScript implementations."
tags: ["benchmark", "wasm"]
icon: "speed"
color: "var(--palette-paint-accent)"
lang: en
order: 3
---

A comparative study of WASM vs JavaScript performance across different workloads and browsers.

## Benchmark Categories

- **CPU-bound**: Matrix operations, hashing, encoding
- **Memory-bound**: Large data processing, image manipulation
- **I/O-bound**: IndexedDB operations, network requests

## Preliminary Results

| Operation | JavaScript | WASM (Rust) | Speedup |
|-----------|------------|-------------|---------|
| QR Generation (1000x) | 450ms | 45ms | 10x |
| SHA-256 (1MB) | 120ms | 18ms | 6.7x |
| Image Resize | 890ms | 210ms | 4.2x |

*Results may vary by browser and hardware.*
