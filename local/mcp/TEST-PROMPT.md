# Prompt de prueba para Claude

Copia el siguiente bloque en una conversación nueva después de reiniciar el
cliente. No necesita skills. La prueba consume el uso normal de tu asistente.

```text
Comprueba mi instalación de Holi Local usando directamente sus herramientas MCP.
No simules herramientas ni sustituyas esta prueba por scripts o invocaciones CLI.
Si no tienes acceso a alguna, indícalo y no declares que pasó.

1. Llama holi_info. Informa versión, carpeta de salida y política de paquetes.
   Usa la carpeta que devuelva; no supongas la ruta predeterminada. No cambies
   mi configuración, no habilites descargas ni pidas credenciales.
2. Llama document_templates y lee los esquemas. Elige un prefijo ASCII único
   para esta ejecución y nombres nuevos que no sobrescriban otros documentos.
3. Llama document_render para crear un informe en español con título, autor y
   dos secciones. Incluye acentos, ñ y el texto literal #panic("es texto").
4. Llama document_compile para producir un PDF A4 desde Typst con un título y
   un archivo virtual seccion.typ incluido desde main.typ. Usa solo archivos
   virtuales. Haz otra llamada con una variable inexistente; espera un error
   de compilación con diagnóstico y sin PDF exitoso.
5. Llama qr_batch para dos PNG: https://holi.tools y "Holi: español y ñ".
   Haz otra llamada para un SVG con https://qr.holi.tools. Usa verificación
   y estilos predeterminados. Revisa cada resultado y el campo verified.
6. Intenta repetir document_render con el mismo nombre del informe: debe
   rechazarlo con OUTPUT_EXISTS. Conserva todos los resultados anteriores.

Devuélveme una tabla de las cinco herramientas, archivos creados y errores
esperados/inesperados. Si puedes abrir los PDF y QR con un visor, revísalos;
si no, aclara que falta inspección visual. Distingue verified del servidor
de una decodificación independiente de los archivos. No inventes checksums,
capturas, lectura de disco ni pruebas que no hayas ejecutado.
```
