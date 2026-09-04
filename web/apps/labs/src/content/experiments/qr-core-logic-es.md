---
title: "Por qué Holi QR conserva un núcleo pequeño en Rust"
description: "Guía de decisión para mantener la lógica QR probada en Rust y el comportamiento del navegador y la UI en TypeScript."
summary: "Rust merece su lugar cuando un encoder puro y probado tiene un consumidor web real; las APIs del navegador y el estado siguen en TypeScript."
tags: ["qr", "rust", "wasm"]
category: "QR"
format: "paper"
icon: "qr_code_2"
color: "var(--palette-qr-accent)"
lang: es
order: 20
---

Holi QR tiene un consumidor web real para su núcleo de codificación, así que un módulo pequeño en Rust puede justificarse. Eso no significa que toda la aplicación deba migrar a Rust.

## Arquitectura

El límite útil es **núcleo puro + adaptador delgado**:

1. **Núcleo:** codificación determinista y generación de la matriz con pruebas unitarias.
2. **Adaptador WASM:** convierte valores del navegador y devuelve una salida compacta.
3. **TypeScript:** archivos, clipboard, composición en canvas, estado, accesibilidad e interfaz.

## La condición para conservar Rust

Conserva el núcleo sólo mientras ofrezca un beneficio medido, se mantenga pequeño y tenga cobertura en navegador. No afirmes una aceleración sin un benchmark reproducible en navegadores y hardware actuales.

## Lo que no debe crecer a su alrededor

Un CLI, TUI o paquete público de Rust no aporta valor automáticamente. Construir esas superficies sólo por simetría arquitectónica agrega trabajo de releases sin mejorar el producto web.

## Checklist de verificación

- Compara la salida con fixtures QR conocidos.
- Prueba la frontera WASM en navegador, no sólo Rust nativo.
- Mide el bundle y costo de inicialización junto con el tiempo de codificación.
- Conserva errores comprensibles después de cruzar el adaptador.
- Confirma que el fallback o estado de error de TypeScript siga siendo útil.
