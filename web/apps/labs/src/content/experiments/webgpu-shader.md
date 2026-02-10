---
title: "WebGPU Shader"
description: "Real-time background rendering using wgpu-compatible pipelines."
tags: ["prueba", "webgpu"]
icon: "animation"
color: "var(--palette-labs-accent)"
lang: en
order: 1
---

This experiment showcases a real-time WebGPU shader running in the background of the Labs page. It demonstrates how to use the `wgpu` crate compiled to WASM to render high-performance graphics directly in the browser.

## Technical Details

- **Renderer**: Custom WGSL shader
- **Backend**: wgpu compiled to WASM via wasm-pack
- **Fallback**: CSS solid dark background when WebGPU is unavailable
