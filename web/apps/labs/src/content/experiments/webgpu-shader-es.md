---
title: "Shader WebGPU"
description: "Renderizado de fondos en tiempo real usando pipelines compatibles con wgpu."
tags: ["prueba", "webgpu"]
icon: "animation"
color: "var(--palette-labs-accent)"
lang: es
order: 1
---

Este experimento muestra un shader WebGPU en tiempo real ejecutándose en el fondo de la página de Labs. Demuestra cómo usar el crate `wgpu` compilado a WASM para renderizar gráficos de alto rendimiento directamente en el navegador.

## Detalles Técnicos

- **Renderizador**: Shader WGSL personalizado
- **Backend**: wgpu compilado a WASM vía wasm-pack
- **Fallback**: Fondo oscuro CSS sólido cuando WebGPU no está disponible
