---
title: "Lógica Core QR"
description: "Análisis técnico de la generación de QR de alto rendimiento en Rust."
tags: ["paper", "rust", "wasm"]
icon: "qr_code_2"
color: "var(--palette-qr-accent)"
lang: es
order: 2
---

Una exploración en profundidad del crate Rust `holi-qr`, que impulsa la generación de códigos QR en todas las aplicaciones de Holi.tools.

## Arquitectura

La generación de QR sigue el patrón **Núcleo + Adaptador**:

1. **holi-qr** (Rust Puro): Contiene toda la lógica de codificación QR
2. **wasm-qr** (Adaptador WASM): Wrapper ligero que expone la API a JavaScript

## ¿Por qué Rust?

- **Rendimiento**: 10x más rápido que implementaciones puras en JavaScript
- **Seguridad**: Memoria segura sin overhead de recolector de basura
- **Portabilidad**: La misma lógica se ejecuta en CLI, WASM y apps nativas
