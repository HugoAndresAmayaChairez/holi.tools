---
title: "Una estructura de proyectos Typst que crece sin estorbar"
description: "Organiza documentos, imágenes, estilos compartidos y exportaciones para guardar varios proyectos en un workspace del navegador."
summary: "Mantén cada documento independiente, reserva lo compartido para reutilización real y resuelve las mismas rutas en carpetas o almacenamiento del navegador."
tags: ["typst", "proyectos", "archivos"]
category: "Typst"
format: "tutorial"
icon: "description"
color: "var(--palette-typst-accent)"
lang: es
order: 3
---

Un solo archivo `main.typ` basta para empezar, pero los documentos pronto acumulan imágenes, bibliografías, estilos y exportaciones. Un árbol predecible evita que el panel de archivos se convierta en todo el producto.

## Usa una carpeta por proyecto

Empieza con un workspace capaz de guardar proyectos independientes:

```text
workspace/
  projects/
    tesis/
      main.typ
      secciones/
      images/
        placeholder.svg
      referencias.bib
    plantilla-factura/
      main.typ
      images/
  shared/
    marca.typ
  exports/
```

Cada proyecto debe compilar sin depender de archivos privados de otro. Así la exportación, respaldo y colaboración son predecibles.

## Resuelve rutas desde la raíz del proyecto

El editor debe conocer el proyecto activo y resolver `images/grafica.svg` desde ahí. Una vez que existe un workspace, no hace falta separar los flujos de “importar archivo” e “importar carpeta”. El panel puede centrarse en crear, renombrar, mover y mostrar el proyecto activo.

## Trata las imágenes como archivos normales

Crea `images/` en cada proyecto inicial e incluye un placeholder ligero. Al arrastrar o pegar una imagen, escríbela ahí e inserta una referencia relativa. Conserva el nombre original sólo después de validar que sea seguro y no choque con otro archivo.

## Comparte estilos con cuidado

El directorio `shared/` sirve para fuentes, colores y funciones comunes, pero crea acoplamiento. Mueve algo ahí sólo cuando dos proyectos reales lo usan. Un proyecto preparado para exportarse debe poder copiar sus dependencias compartidas dentro de su propio árbol.

## Separa fuente y salida

Los PDF generados no son documentos fuente. Coloca las descargas en una zona de exportación o usa el diálogo de guardado del navegador. No escribas continuamente cada frame del preview al disco.

## Soporta ambos modos de almacenamiento

La estructura debe ser idéntica en una carpeta seleccionada y en el almacenamiento administrado por el navegador. Sólo cambia el adaptador. Así las rutas de compilación, proyectos recientes, estados vacíos y recuperación permanecen consistentes.

## Checklist del proyecto inicial

- `main.typ` compila de inmediato.
- `images/placeholder.svg` confirma las rutas relativas.
- El nombre del proyecto puede cambiar sin romper imports.
- Autosave escribe sólo después de un cambio local.
- Exportar nunca sobreescribe un archivo fuente.
- Perder el permiso de carpeta no descarta el borrador en memoria.
