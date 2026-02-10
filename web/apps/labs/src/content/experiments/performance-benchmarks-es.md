---
title: "Tiempos de Referencia"
description: "Comparativa de rendimiento entre WASM e implementaciones nativas en JavaScript."
tags: ["benchmark", "wasm", "prueba"]
icon: "speed"
color: "var(--palette-paint-accent)"
lang: es
order: 3
---

Un estudio comparativo del rendimiento entre WASM y JavaScript a través de diferentes cargas de trabajo y navegadores.

## Categorías de Pruebas

- **Limitado por CPU**: Operaciones con matrices, hashing, codificación
- **Limitado por Memoria**: Procesamiento de grandes volúmenes de datos, manipulación de imágenes
- **Limitado por E/S**: Operaciones en IndexedDB, peticiones de red

## Resultados Preliminares

| Operación | JavaScript | WASM (Rust) | Aceleración |
|-----------|------------|-------------|-------------|
| Generación QR (1000x) | 450ms | 45ms | 10x |
| SHA-256 (1MB) | 120ms | 18ms | 6.7x |
| Redimensionado de Imagen | 890ms | 210ms | 4.2x |

*Los resultados pueden variar según el navegador y el hardware.*
