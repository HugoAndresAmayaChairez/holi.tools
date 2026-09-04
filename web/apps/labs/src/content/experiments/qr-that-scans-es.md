---
title: "Diseña un código QR que sí se pueda escanear"
description: "Checklist visual de contraste, zona silenciosa, corrección de errores, logos y verificación de exportación."
summary: "Trata la decoración como una capa limitada alrededor de un símbolo legible por máquinas y verifica el archivo exportado, no sólo el preview."
tags: ["qr", "accesibilidad", "pruebas"]
category: "QR"
format: "tutorial"
icon: "qr_code_2"
color: "var(--palette-qr-accent)"
lang: es
order: 2
---

Un QR puede verse impresionante en el editor y fallar en un menú impreso, un teléfono con poca luz o una imagen comprimida en redes. Una buena personalización protege las partes que necesita el escáner.

## Empieza por el contraste

Los módulos deben ser claramente más oscuros que el fondo. Evita depender de transparencias para el contraste esencial porque la superficie final puede ser desconocida. Un preview sobre cuadros no demuestra que la imagen exportada funcione en un póster.

## Conserva la zona silenciosa

Mantén un margen vacío alrededor de todo el código. Marcos, textos y fondos decorativos deben vivir fuera de esa zona. Recortar demasiado es una de las formas más rápidas de volver poco confiable un QR válido.

## Elige la corrección de errores con intención

Una corrección mayor tolera más daño o un logo pequeño al centro, pero también produce un símbolo más denso. Empieza con el nivel más bajo que resuelva el caso y auméntalo sólo si el diseño necesita esa resistencia adicional.

## Mantén los logos pequeños

Un logo cubre módulos aunque tenga un marco limpio. Céntralo, mantenlo compacto y evita cubrir los tres patrones de búsqueda. Si el diseño necesita una ilustración grande, colócala alrededor del QR y no dentro.

## Prueba la exportación real

El PNG, SVG o PDF exportado es lo que la gente escaneará. Verifícalo después de cada cambio visual importante:

1. Escanea al tamaño físico o digital previsto.
2. Usa al menos dos lectores distintos.
3. Prueba con mucha y poca luz.
4. Prueba el archivo después de redimensionarlo o comprimirlo.
5. Imprime una muestra cuando el destino sea papel.

## Construye un editor seguro

Una herramienta QR debe advertir sobre contraste bajo, falta de zona silenciosa, cobertura excesiva del logo o una auto-verificación fallida. Las advertencias ayudan más que impedir toda experimentación, pero la descarga debe dejar claro cualquier riesgo pendiente.

## Revisión de privacidad

La generación de un QR estático puede ocurrir por completo en el navegador. El QR todavía puede contener datos sensibles, así que previews, valores recientes y eventos de analítica no deben enviar el texto codificado. Si se introduce un QR dinámico o servicio de redirección, se convierte en una función conectada y necesita una explicación de privacidad separada.
