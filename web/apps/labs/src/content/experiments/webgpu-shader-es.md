---
title: "Cuándo vale la pena un fondo WebGPU"
description: "Checklist de mejora progresiva para efectos visuales que nunca bloquean el flujo del producto."
summary: "Usa WebGPU sólo si el efecto aporta valor medido, inicia después del contenido útil, respeta movimiento reducido y tiene un fallback CSS tranquilo."
tags: ["webgpu", "graphics", "shader"]
category: "Gráficos"
format: "field-note"
icon: "animation"
color: "var(--palette-labs-accent)"
lang: es
order: 40
---

Un shader puede crear identidad, pero también compite con el contenido por batería, GPU, peso del bundle y atención. Trátalo como decoración opcional.

## Carga primero el contenido útil

Renderiza la página antes de solicitar un adapter o descargar un runtime gráfico. Inicia el efecto durante tiempo ocioso y detenlo cuando la página esté oculta.

## Respeta al dispositivo y a la persona

- Desactiva la animación con `prefers-reduced-motion`.
- Reduce la resolución en pantallas limitadas.
- Pausa el efecto fuera del viewport.
- Mantén el contraste del texto independiente de los píxeles en movimiento.

## Ofrece un fallback completo

Un color o gradiente CSS sencillo debe conservar la identidad sin WebGPU. Hardware no compatible, inicialización bloqueada o pérdida del dispositivo nunca deben producir una página vacía.

## Mide antes de conservarlo

Registra costo de inicio, bytes transferidos, tiempo por frame, consumo y estabilidad de layout. Si el efecto no mejora suficiente la comprensión o reconocimiento del producto para justificar esos costos, elimínalo.
