---
title: "Crea un workspace del navegador que no atrape al usuario"
description: "Una arquitectura práctica para trabajar en una carpeta elegida o en un respaldo del navegador sin cambiar el flujo del editor."
summary: "Usa un solo contrato de workspace, dos adaptadores, permisos explícitos y recuperación exportable para que local-first siga siendo útil sin acceso a carpetas."
tags: ["local-first", "archivos", "indexeddb"]
category: "Local-first"
format: "tutorial"
icon: "folder_open"
color: "var(--palette-labs-accent)"
lang: es
order: 1
featured: true
---

Un editor local-first no debería obligar a entender el almacenamiento del navegador antes de crear algo. El flujo puede ser el mismo si los archivos viven en una carpeta elegida por la persona o en almacenamiento administrado por el navegador.

## Empieza con un solo contrato de workspace

Entrega al editor una interfaz pequeña en lugar de acceso directo a cada API:

```ts
interface Workspace {
  list(path: string): Promise<Entry[]>;
  read(path: string): Promise<Uint8Array>;
  write(path: string, data: Uint8Array): Promise<void>;
  remove(path: string): Promise<void>;
}
```

La interfaz puede abrir, guardar, renombrar y previsualizar sin saber qué adaptador está activo.

## Adaptador A: carpeta elegida por la persona

Usa File System Access cuando esté disponible y alguien seleccione una carpeta. Conserva el handle localmente, pero vuelve a pedir permiso cuando el navegador lo exija. Guardar un handle no significa tener permiso de lectura permanente.

Reglas importantes:

- Abrir la carpeta debe ser una acción deliberada.
- No explores fuera del directorio seleccionado.
- Muestra el nombre de la carpeta activa y el estado del permiso.
- Si se pierde el permiso, conserva el documento en memoria y ofrece una exportación de recuperación.

## Adaptador B: workspace propiedad del navegador

Si no hay carpeta activa, crea el mismo árbol de proyecto en IndexedDB u OPFS. Es el workspace predeterminado, no un estado de error. Debe aceptar los mismos comandos que el adaptador de carpeta.

Una estructura inicial útil puede ser:

```text
workspace/
  projects/
    welcome/
      main.typ
      images/
        sample.svg
  shared/
  exports/
```

## Cambia sin perder trabajo

Cambiar de adaptador es una migración, no un simple toggle. Copia al destino, verifica cada archivo y sólo entonces marca el nuevo workspace como activo. Nunca borres el origen automáticamente.

## Añade una vía de recuperación

El navegador o la persona pueden limpiar el almacenamiento. Un producto resistente necesita:

1. Estado visible del workspace.
2. Exportación de un proyecto o de todo el workspace.
3. Importación que valide rutas antes de escribir.
4. Advertencia antes de cambios grandes o irreversibles.

## Revisión de privacidad

Ningún adaptador necesita servidor. La ruta elegida, nombres de archivo, handles y bytes de los documentos deben quedarse en el dispositivo. Al servir la aplicación el proveedor de hosting todavía recibe metadata de conexión como IP y horario de la solicitud, pero no el contenido local salvo que una función conectada lo envíe explícitamente.

## Checklist para publicar

- El editor funciona antes de tener cuenta o carpeta.
- El permiso de carpeta tiene estados claros: solicitado, concedido y perdido.
- Ambos adaptadores pasan las mismas pruebas de comportamiento.
- La persona puede exportar antes de limpiar o migrar almacenamiento.
- La inspección de red no muestra documentos ni nombres enviados durante la edición local.
