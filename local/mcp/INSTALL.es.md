# Instalar Holi Local 0.3

El instalador incluye el motor Rust, fuentes, plantillas, skills, licencias y
código fuente. No necesitas Node, npm, Python, Rust ni permisos de administrador.
Windows x64 y Ubuntu 24.04 x64 son los objetivos del instalador. El paquete
portable de macOS se distribuye por separado.

Estado: candidato local/CI; todavía no hay una descarga pública de 0.3.0.
Obtén el instalador del responsable del proyecto o del artefacto de CI de la
revisión que quieras probar. No hay todavía un comando remoto publicado que
se pueda copiar y ejecutar. Los comandos siguientes usan el archivo descargado.

## Opción 1: rutas predeterminadas

Cierra el cliente de Claude antes de instalar o actualizar.

En Windows puedes abrir `holi-local-setup-0.3.0-win32-x64.exe` con doble clic.
Se abre una consola que pregunta las carpetas y el cliente; Enter conserva
los valores sugeridos. Para instalar y conectar Claude Desktop en un comando
de PowerShell desde la carpeta de descarga:

```powershell
.\holi-local-setup-0.3.0-win32-x64.exe --yes --client claude-desktop
```

Para Claude Code sustituye el cliente por `claude-code`. En Ubuntu, desde la
carpeta de descarga:

```sh
chmod +x ./holi-local-setup-0.3.0-linux-x64 && ./holi-local-setup-0.3.0-linux-x64 --yes --client claude-code
```

No uses `sudo`. Con `--client none` instalas Holi y generas la configuración sin
modificar ningún cliente; es el valor predeterminado si no eliges uno.

| Elemento | Windows | Ubuntu |
| --- | --- | --- |
| Programa | `%LOCALAPPDATA%\Programs\HoliLocal` | `$HOME/.local/share/holi-local` |
| Documentos generados | `%USERPROFILE%\Holi\Output` | `$HOME/Holi/Output` |
| Configuración Claude Code | `%USERPROFILE%\.claude.json` | `$HOME/.claude.json` |
| Skills personales Claude Code | `%USERPROFILE%\.claude\skills` | `$HOME/.claude/skills` |
| Configuración Claude Desktop | `%APPDATA%\Claude\claude_desktop_config.json` | No se configura automáticamente |

En Ubuntu, si existe `XDG_DATA_HOME`, el programa se instala en
`$XDG_DATA_HOME/holi-local`. Consulta `--print-defaults` para ver tus rutas.
Dentro de la carpeta del programa, `installation.json`, `mcp.json` e
`INSTALLATION.md` registran las rutas absolutas reales. El ejecutable está en
`versions/<versión>-<hash>/holi-mcp.exe` (Windows) o `holi-mcp` (Ubuntu).
No hace falta añadirlo al PATH.

## Opción 2: tus propias carpetas

Las rutas deben ser absolutas, distintas y no estar una dentro de otra. Se
admiten espacios y caracteres como ñ. Usa carpetas reales, sin enlaces o
junctions, y una carpeta nueva o previamente administrada por este instalador.

```powershell
.\holi-local-setup-0.3.0-win32-x64.exe --yes --client claude-desktop --install-dir "D:\Mis programas\Holi" --output-dir "D:\Mis documentos\Holi"
```

```sh
./holi-local-setup-0.3.0-linux-x64 --yes --client claude-code --install-dir "$HOME/Aplicaciones/Holi" --output-dir "$HOME/Documentos/Holi"
```

También puedes elegir otra configuración con `--client-config` y otra carpeta
de skills de Claude Code con `--skills-dir`. Si usas `CLAUDE_CONFIG_DIR`, debes
pasar ambas explícitamente. El instalador no interpreta variables dentro de
un archivo JSON: genera rutas absolutas ya resueltas.

## Conectar la IA y añadir las skills

Con `--client claude-code` o `--client claude-desktop`, el instalador añade
`mcpServers.holi-local` conservando las demás opciones. Guarda una copia del
JSON anterior como `holi-backup-*.json`. Si detecta otra instalación de Holi,
se detiene: revisa las rutas y usa `--replace-client` para sustituir solamente
esa entrada con copia de respaldo. No modifica permisos de herramientas.

Reinicia Claude. En Claude Code consulta `/mcp`; configuraciones locales o del
proyecto pueden tener prioridad sobre la configuración de usuario. Si este
repo conserva un `.mcp.json` anterior, revísalo antes de atribuir a la instalación
un servidor diferente. En Desktop comprueba el servidor local en la configuración
de desarrollador. El proceso de Holi lo inicia el cliente cuando lo necesita.

Las skills son instrucciones; no crean por sí mismas una conexión MCP:

- **Claude Code:** la opción `claude-code` instala `holi-documents/SKILL.md` y
  `holi-qr-batch/SKILL.md` en la carpeta personal. Puedes invocarlas con
  `/holi-documents` y `/holi-qr-batch`.
- **Claude Desktop:** en Customize → Skills, carga los ZIP
  `skills/holi-documents.zip` y `skills/holi-qr-batch.zip` de la carpeta del
  programa, si tu cuenta permite skills personalizadas. Cada ZIP contiene
  una carpeta y su `SKILL.md`. No subas `installation.json` ni la configuración
  del cliente como skill. La disponibilidad de las herramientas depende de
  la superficie de Claude y su conexión MCP; compruébala en la conversación.
- **Otro cliente MCP:** combina la entrada de `mcp.json` con su configuración
  sin borrar otras herramientas. Las skills también están expuestas como
  recursos MCP; puedes pedir a la IA que los lea si el cliente admite recursos.

Las skills consultan `holi_info` para descubrir la carpeta configurada. No
suponen que usaste la ruta predeterminada. Copia [TEST-PROMPT.md](TEST-PROMPT.md)
en una conversación nueva para comprobar las cinco herramientas.

## Actualizar, reparar o quitar

Ejecuta el nuevo instalador con la misma carpeta y cliente. Conserva las
versiones anteriores y los documentos. Si editaste una skill personal, se
respalda antes de reemplazarla. Los respaldos pueden contener datos privados
de la configuración: mantenlos en tu equipo.

Para trasladar el programa, vuelve a instalar en la nueva carpeta y conecta
el cliente con `--replace-client`. No muevas solamente el ejecutable: la
configuración contiene su ruta absoluta. Para cambiar la salida, vuelve a
ejecutar el instalador con `--output-dir`; no mueve los documentos existentes.

Para desinstalar, cierra Claude, elimina únicamente la entrada `holi-local` de
su JSON y las dos carpetas personales de skills si ya no las usas. Después
puedes borrar la carpeta del programa que aparece en `installation.json`.
La carpeta de documentos se conserva. No hay servicio ni cambio de PATH que
revertir. Si quedó `.install.lock` tras un cierre inesperado, comprueba que no
hay otro instalador en ejecución antes de quitar ese archivo y reintentar.

La distribución candidata no lleva firma de editor de Windows. Comprueba
el origen y el SHA-256 entregado con el archivo; el hash detecta corrupción,
no sustituye la confianza en el origen. No desactives las protecciones del sistema.
En PowerShell puedes consultar `Get-FileHash .\holi-local-setup-0.3.0-win32-x64.exe`;
en Ubuntu, `sha256sum -c holi-local-setup-0.3.0-linux-x64.sha256`.

El instalador funciona sin red. Descargarlo contacta al proveedor de alojamiento.
El renderizado es local, pero el proveedor de la IA puede recibir el prompt,
las entradas y los resultados MCP. Los paquetes Typst remotos están desactivados
por defecto. No hay sincronización ni vista previa automática de estos trabajos
en las aplicaciones web.

Referencias: [MCP en Claude Code](https://code.claude.com/docs/en/mcp),
[skills personales](https://code.claude.com/docs/en/skills),
[skills en Claude](https://support.claude.com/en/articles/12512180-use-skills-in-claude).
