---
title: "Cómo comparar WASM y JavaScript de forma justa"
description: "Checklist reproducible para medir inicio, transferencia, memoria y latencia visible en el navegador."
summary: "Un benchmark útil mide el recorrido completo publicado y documenta el entorno en vez de presentar loops aislados como verdad del producto."
tags: ["benchmark", "wasm", "rendimiento"]
category: "Rendimiento"
format: "experiment"
icon: "speed"
color: "var(--palette-paint-accent)"
lang: es
order: 30
---

Una implementación WASM no es automáticamente más rápida que JavaScript. El resultado depende del tamaño de la carga, conversión de datos, compilación, caché, navegador y dispositivo.

## Define la pregunta visible para el usuario

Mide una tarea real como “tiempo desde presionar Generar hasta mostrar un QR escaneable”. Incluye la carga y conversión que la persona realmente espera.

## Registra el entorno

- Navegador y versión exacta.
- Sistema operativo y hardware.
- Ejecuciones frías y calientes.
- Tamaño del bundle y bytes de WASM.
- Entradas de muestra y número de iteraciones.

## Reporta distribuciones

Usa varias ejecuciones y publica la mediana junto con un percentil alto. Separa la inicialización, pero no la escondas. Si el cambio sólo aparece en un loop sintético y no en la latencia de interacción, dilo.

## Decide con los costos del producto

El rendimiento es sólo una entrada. Compara también complejidad, depuración, accesibilidad, despliegue, fallback de navegador y experiencia de contribución. Conserva WASM sólo cuando el balance completo siga siendo positivo.
