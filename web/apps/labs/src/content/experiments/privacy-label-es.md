---
title: "Escribe una etiqueta de privacidad que sí se pueda verificar"
description: "Sigue los datos desde la entrada hasta el destinatario y convierte el resultado en un resumen breve y honesto."
summary: "Una etiqueta útil separa contenido local y metadata de conexión, nombra los modos conectados y se mantiene sincronizada con la implementación."
tags: ["privacidad", "metadata", "producto"]
category: "Privacidad"
format: "tutorial"
icon: "shield-check"
color: "var(--palette-labs-accent)"
lang: es
order: 4
---

“Privado” es demasiado amplio para ser una afirmación útil. Una buena etiqueta explica qué pasa con el contenido, qué puede observar el proveedor de red y qué cambia cuando se activa una función conectada.

## Dibuja el flujo completo

Para cada acción sigue esta secuencia:

```text
entrada → memoria → almacenamiento → red → proveedor → destinatario
```

Registra qué existe en cada etapa, durante cuánto tiempo y con qué propósito. Hazlo para el flujo local predeterminado y de nuevo para cada modo conectado.

## Separa contenido y metadata

Si un documento se procesa en el navegador, dilo claramente. No lo conviertas en la afirmación más fuerte de que nadie observa nada. El proveedor de hosting normalmente puede recibir dirección IP, hora, ruta solicitada, user agent y volumen de tráfico al servir la aplicación.

La diferencia debe ser visible:

- **Contenido:** texto del documento, imágenes, nombres de archivo y valores QR.
- **Metadata de conexión:** IP, horario, ruta y volumen de solicitudes.
- **Metadata de colaboración:** identificadores de sala, enrutamiento del relay, direcciones entre pares y eventos de presencia, según la arquitectura.

## Etiqueta el modo activo

La edición local, colaboración directa entre pares y colaboración por relay tienen destinatarios y riesgos distintos. Nombra el modo actual en la interfaz en lugar de esconder la diferencia en una política.

## Evita promesas absolutas

Prefiere afirmaciones vinculadas al comportamiento:

- “Este documento se procesa en tu navegador.”
- “Abrir un archivo local no lo sube.”
- “Cloudflare puede procesar metadata de conexión al servir esta página.”

Evita “zero knowledge” o “no se recopila ninguna información” salvo que cada capa del sistema publicado haya sido diseñada y verificada para esa propiedad exacta.

## Coloca el resumen cerca de la acción

Muestra una etiqueta compacta en el shell del producto y enlaza los detalles. Antes de cruzar una frontera de red, ofrece una explicación más específica y una acción explícita. Una política aislada queda demasiado lejos de la decisión.

## Mantenla sincronizada

Trata la etiqueta como contrato con el usuario. Una versión que cambie almacenamiento, analítica, colaboración, reportes de error o proveedores debe actualizar el flujo y el Shadow Log visible.

## Checklist de verificación

- Inspecciona las solicitudes durante el flujo completo.
- Busca campos sensibles en logs y esquemas de telemetría.
- Prueba la edición local con el servicio colaborativo desconectado.
- Confirma que nombres y bytes del documento no entren a reportes de error.
- Explica proveedor y destinatario en cada modo conectado.
