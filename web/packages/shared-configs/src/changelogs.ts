export interface VersionEntry {
    version: string;
    date: string;
    changes: string[];
}

export type LocalizedChangelog = Record<string, VersionEntry[]>;

export const mainAppChangelog: LocalizedChangelog = {
    en: [
        {
            version: "0.8.1",
            date: "2026-09-02",
            changes: [
                "Turned local recent-tool history into a clearly labeled, styled shortcut rail instead of loose links",
                "Bundled the multilingual Noto Sans family into Holi's own build with no third-party font requests",
                "Kept recent history local to the browser and limited it to tool identifiers"
            ]
        },
        {
            version: "0.8.0",
            date: "2026-09-02",
            changes: [
                "Redesigned Main as an editorial, multicolor product catalog with direct tool actions",
                "Added localized product landings for Image, Typst, QR, Metadata, and Labs without fabricated testimonials",
                "Introduced subtle transparent sketch identities and kept Papers as a Labs editorial format"
            ]
        },
        {
            version: "0.7.0",
            date: "2026-09-02",
            changes: [
                "Rebuilt the tool explorer with clear Create, Transform, Inspect, and Learn categories",
                "Added search, Ctrl/Command K quick opening, and local recent-tool shortcuts",
                "Launched Holi Image as a featured available product and disclosed the local recent list"
            ]
        },
        {
            version: "0.6.0",
            date: "2026-09-02",
            changes: [
                "Removed the unstable outer glow from the shared product dock",
                "Localized the shared configuration, version, donation, support, privacy, and 404 surfaces in all seven Holi languages",
                "Added a complete localized privacy summary to every Main route"
            ]
        },
        {
            version: "0.5.0",
            date: "2026-09-02",
            changes: [
                "Marked Holi Typst as available in the public tool explorer",
                "Made the product dock inherit Main's active light or dark palette",
                "Aligned shared cards and controls with explicit Holi theme choices"
            ]
        },
        {
            version: "0.4.0",
            date: "2026-09-02",
            changes: [
                "Unified Configuration, Versions, and Privacy in the shared Holi product dock",
                "Added local theme and language preferences plus product navigation inside Configuration",
                "Placed donations, support, and the visible Shadow Log inside Versions"
            ]
        },
        {
            version: "0.3.1",
            date: "2026-09-02",
            changes: [
                "Restored Version Log as a floating control on the right",
                "Moved privacy into a matching floating control on the left with a dedicated details drawer",
                "Removed the full-width privacy and version footer bar"
            ]
        },
        {
            version: "0.3.0",
            date: "2026-09-02",
            changes: [
                "Added a visible privacy summary that distinguishes local content from Cloudflare connection metadata",
                "Added shared donation and support access across the Holi product shell",
                "Refocused Holi as a web-first product family and retired the CLI/TUI roadmap"
            ]
        },
        {
            version: "0.2.0",
            date: "2026-01-30",
            changes: [
                "Project restructuring for future TUI support",
                "Language support",
                "Removed unfinished tools"
            ]
        },
        {
            version: "0.1.1",
            date: "2026-01-12",
            changes: [
                "i18n migration + English/Spanish support",
                "Hotfix: Updated dependencies",
                "Minor UI improvements"
            ]
        },
        {
            version: "0.1.0",
            date: "2026-01-12",
            changes: [
                "Configuration centralization",
                "Architecture cleanup",
                "Prepared for 0.1.0 release"
            ]
        }
    ],
    es: [
        {
            version: "0.8.1",
            date: "2026-09-02",
            changes: [
                "Convertido el historial local de herramientas en una franja de accesos clara en vez de enlaces sueltos",
                "Incluida la familia multilingüe Noto Sans dentro del build de Holi sin pedir fuentes a terceros",
                "Conservado el historial de recientes en el navegador y limitado a identificadores de herramientas"
            ]
        },
        {
            version: "0.8.0",
            date: "2026-09-02",
            changes: [
                "Rediseñado Main como un catálogo editorial y multicolor con acceso directo a cada herramienta",
                "Añadidas landings localizadas para Image, Typst, QR, Metadata y Labs sin testimonios inventados",
                "Incorporadas identidades sketch transparentes y conservado Papers como formato editorial dentro de Labs"
            ]
        },
        {
            version: "0.7.0",
            date: "2026-09-02",
            changes: [
                "Rehecho el explorador con categorías claras de Crear, Transformar, Inspeccionar y Aprender",
                "Añadidas búsqueda, apertura rápida con Ctrl/Command K y accesos recientes locales",
                "Publicado Holi Image como producto destacado y descrita la lista local de recientes"
            ]
        },
        {
            version: "0.6.0",
            date: "2026-09-02",
            changes: [
                "Eliminado el brillo exterior inestable del dock compartido",
                "Traducidas las superficies compartidas de configuración, versión, donación, soporte, privacidad y 404 a los siete idiomas de Holi",
                "Añadido un resumen de privacidad completo y localizado en todas las rutas de Main"
            ]
        },
        {
            version: "0.5.0",
            date: "2026-09-02",
            changes: [
                "Holi Typst ahora aparece disponible en el explorador público de herramientas",
                "El dock de producto ahora hereda la paleta clara u oscura activa de Main",
                "Alineados los controles y tarjetas compartidos con el tema explícito de Holi"
            ]
        },
        {
            version: "0.4.0",
            date: "2026-09-02",
            changes: [
                "Unificadas Configuración, Versiones y Privacidad en el dock compartido de productos Holi",
                "Añadidas preferencias locales de tema e idioma y navegación del producto dentro de Configuración",
                "Integrados donaciones, soporte y el Shadow Log visible dentro de Versiones"
            ]
        },
        {
            version: "0.3.1",
            date: "2026-09-02",
            changes: [
                "Restaurado Version Log como control flotante a la derecha",
                "Movida la privacidad a un control flotante equivalente a la izquierda con su propio panel de detalles",
                "Eliminada la barra de privacidad y versión que ocupaba todo el footer"
            ]
        },
        {
            version: "0.3.0",
            date: "2026-09-02",
            changes: [
                "Añadido un resumen de privacidad visible que distingue el contenido local de la metadata de conexión de Cloudflare",
                "Añadido acceso compartido a donaciones y soporte en el shell de productos Holi",
                "Holi ahora se enfoca como una familia web-first y se retiró el roadmap de CLI/TUI"
            ]
        },
        {
            version: "0.2.0",
            date: "2026-01-30",
            changes: [
                "Reestructuración del proyecto para futuro soporte TUI",
                "Soporte de idiomas",
                "Eliminación de tools no hechas"
            ]
        },
        {
            version: "0.1.1",
            date: "2026-01-12",
            changes: [
                "migración a i18 y soporte de español e inglés",
                "Hotfix: Actualización de dependencias",
                "Mejoras menores de UI"
            ]
        },
        {
            version: "0.1.0",
            date: "2026-01-12",
            changes: [
                "Centralización de configuración",
                "Limpieza de arquitectura",
                "Preparación para release 0.1.0"
            ]
        }
    ]
};

export const metadataAppChangelog: VersionEntry[] = [
    {
        version: "0.5.1",
        date: "2026-09-02",
        changes: [
            "Corregido el fallo que dejaba la herramienta en blanco al abrir el primer archivo o carpeta",
            "El inspector de detalles permanece visible también con un único archivo o una carpeta pequeña",
            "Aclarado que el espacio de trabajo es temporal y no conserva historial de archivos ni carpetas al recargar"
        ]
    },
    {
        version: "0.5.0",
        date: "2026-09-02",
        changes: [
            "Rediseñada la entrada como un inspector editorial y directo con una zona de archivos visible desde el primer momento",
            "Creada una paleta propia verde para Metadata y alineado con ella el dock compartido en temas claro y oscuro",
            "Incluidas tipografías multilingües dentro del build sin solicitudes de fuentes a servicios externos",
            "Conservados el análisis, la limpieza y las exportaciones en el navegador sin subir los archivos"
        ]
    },
    {
        version: "0.4.1",
        date: "2026-09-02",
        changes: [
            "Añadido el detalle sketch del lince como identidad visual decorativa de Metadata",
            "Eliminado del menú el enlace Papers que no pertenece a esta herramienta",
            "Conservados sin cambios el procesamiento local y la paleta legible en temas claro y oscuro"
        ]
    },
    {
        version: "0.4.0",
        date: "2026-09-02",
        changes: [
            "Añadidas rutas y flujo completo del inspector en inglés, español, chino, hindi, árabe, bengalí y portugués",
            "Traducidos el análisis de privacidad, estados, alertas, acciones, carpetas y metadatos comunes",
            "Eliminado el brillo exterior del dock y conservado el color derivado del tema activo"
        ]
    },
    {
        version: "0.3.1",
        date: "2026-09-02",
        changes: [
            "El dock compartido ahora deriva superficie, texto, bordes y acento de la paleta activa de Metadata",
            "Las tarjetas compartidas respetan el tema elegido en Holi y no el tema independiente del sistema"
        ]
    },
    {
        version: "0.3.0",
        date: "2026-09-02",
        changes: [
            "Unificadas Configuración, Versiones y Privacidad en el dock compartido de productos Holi",
            "Añadidas preferencias locales de tema e idioma y navegación de la herramienta",
            "Integrados donaciones, soporte y el Shadow Log visible dentro de Versiones"
        ]
    },
    {
        version: "0.2.1",
        date: "2026-09-02",
        changes: [
            "Separados privacidad y Version Log en controles flotantes a ambos lados de la pantalla",
            "La información de privacidad ahora se abre en un panel de detalles sin ocupar el footer"
        ]
    },
    {
        version: "0.2.0",
        date: "2026-09-02",
        changes: [
            "Añadido un resumen visible que explica el procesamiento local de archivos y la metadata técnica visible para Cloudflare",
            "Integrados los accesos compartidos a donaciones, soporte, versión y Shadow Log",
            "Alineada la documentación del producto con la arquitectura web-first de Holi"
        ]
    },
    {
        version: "0.1.1",
        date: "2026-05-31",
        changes: [
            "Alineada la version del paquete con el changelog visible de la app",
            "Anadido sitemap XML real para que robots.txt apunte a una ruta existente",
            "Extraidas utilidades puras de metadata para empezar a reducir el componente principal",
            "Anadido reporte de privacidad con hallazgos de GPS, autor, fechas, software y datos organizacionales",
            "Reescrito el flujo de importacion del Explorer para mezclar carpetas y archivos, expandir carpetas nuevas y evitar duplicados",
            "Refresco de archivos reimportados en el mismo path para evitar metadata obsoleta",
            "Soporte para carpetas vacias arrastradas al Explorer y cancelacion de imports pendientes al limpiar",
            "Anadido soporte de arrastre con File System Access API para mezclas reales de carpetas y archivos",
            "Captura sincronica de handles del drop para no perder carpetas cuando el navegador degrada a entradas legacy",
            "Separada la accion de limpiar metadata de imagen y vaciar el Explorer",
            "Unificado el selector de carpetas para usar showDirectoryPicker en Windows cuando esta disponible",
            "Reforzado el selector legacy de carpetas para conservar rutas relativas y diagnosticar imports planos",
            "La limpieza de imagen ahora intenta guardar con dialogo nativo y mantiene descarga manual del archivo limpio",
            "Ampliada deteccion de metadata para SVG, ZIP, XLSX, PPTX, JSON, CSV, HTML, BMP, TIFF, ICO, HEIC/HEIF, FLAC, OGG y WAV",
            "Anadidas pruebas unitarias para utilidades de archivo, export CSV y deteccion de privacidad"
        ]
    },
    {
        version: "0.1.0",
        date: "2026-03-11",
        changes: [
            "Interfaz rediseñada: zona de drop interactiva en segundo plano y barra de navegación flotante tipo 'pill'",
            "Soporte recursivo para arrastrar y soltar carpetas completas en el entorno",
            "Estructura del explorador aplanada para visualización directa y simplificada de archivos y carpetas",
            "Menú contextual personalizado con soporte para remover nodos del entorno de trabajo (workspace)",
            "Función de edición in-memory de metadatos: los campos se pueden editar directamente y exportar en CSV/JSON interactivos",
            "Indicadores visuales en pantalla para advertir sobre ediciones no guardadas/exportadas"
        ]
    },
    {
        version: "0.0.1",
        date: "2026-01-30",
        changes: [
            "Release inicial del inspector de metadata",
            "Extracción local/offline de metadatos",
            "Soporte básico de metadata para PNG/JPEG/PDF/MP3/DOCX"
        ]
    }
];

export const qrAppChangelog: LocalizedChangelog = {
    en: [
        {
            version: "1.0.2",
            date: "2026-09-04",
            changes: [
                "Fixed the live preview and the PNG, JPG, WebP and PDF exports being vertically mirrored: the finder eyes now sit top-left, top-right and bottom-left exactly as in the SVG, and the Water modules, Heart eye and Leaf frame render the way their Shapes tiles show them",
                "The readability check now waits for the selected shapes before capturing, so its verdict always refers to the current style",
                "Scan mode can be closed again (button or Escape), returns to where you were, and on phones scrolls straight to the image drop zone",
                "The scanner keeps its translated copy in every state, explains what to do on the stage, and tries the browser's native detector before the local Rust decoder for camera photos"
            ]
        },
        {
            version: "1.0.1",
            date: "2026-09-04",
            changes: [
                "Kept the Content and Style collapse controls independent and synchronized their accessible collapse and expand labels",
                "Removed the unintended mobile gap caused by the decorative moth participating in the workspace layout",
                "Centered the mobile tool tabs while preserving horizontal scrolling for narrower screens and longer translations"
            ]
        },
        {
            version: "1.0.0",
            date: "2026-09-04",
            changes: [
                "Rebuilt QR as a workspace: content rail, live stage, and docked style tabs (Colors, Shapes, Effects, Image, Frame, Advanced) with a bottom sheet on phones",
                "Adopted the warm Holi editorial palette and Noto Sans; light, dark, and transparent preview backgrounds plus zoom",
                "Added saved styles (browser-local) with JSON import and export, and style links that travel in the URL fragment only",
                "Added an optional text frame (\"Scan me\") included in PNG, JPG, WebP, PDF, and SVG exports",
                "Redrew the Capsule, Chain, Water, Pixel modules, the Diamond and Clover eye frames, and the Grid, Star, and Diamond eye balls so each matches its name and keeps the finder ratio scannable",
                "Shape tiles now preview the exact renderer geometry; the Diamond frame warns which eye balls stay scannable",
                "Keyboard shortcuts: Ctrl+S download, Ctrl+Shift+C copy, 1–6 switch tabs",
                "Removed the floating draggable panels and the legacy sidebar"
            ]
        },
        {
            version: "0.9.1",
            date: "2026-09-02",
            changes: [
                "Added the transparent moth sketch as QR's quiet product identity",
                "Moved Papers discovery and canonical ownership to Holi Labs",
                "Kept legacy QR paper URLs as redirects to the matching localized Labs reading"
            ]
        },
        {
            version: "0.9.0",
            date: "2026-09-02",
            changes: [
                "Removed the unstable outer glow from the shared product dock",
                "Localized QR privacy facts and every shared product control in all seven supported languages",
                "Published the complete engineering-paper index and article in all seven supported languages"
            ]
        },
        {
            version: "0.8.0",
            date: "2026-09-02",
            changes: [
                "Fixed brand icons, Generate, Shapes, Colors, Advanced, selectors, and export menus in explicit light mode",
                "Removed system-theme overrides that could make QR controls unreadable after choosing a Holi theme",
                "Made the product dock and shared cards inherit the active QR palette"
            ]
        },
        {
            version: "0.7.0",
            date: "2026-09-02",
            changes: [
                "Unified Configuration, Versions, and Privacy in the shared Holi product dock",
                "Added local theme and language preferences plus QR navigation inside Configuration",
                "Placed donations, support, and the visible Shadow Log inside Versions"
            ]
        },
        {
            version: "0.6.1",
            date: "2026-09-02",
            changes: [
                "Separated privacy and Version Log into matching floating controls",
                "Moved privacy details into a dedicated drawer and removed the full-width footer bar"
            ]
        },
        {
            version: "0.6.0",
            date: "2026-09-02",
            changes: [
                "Added a visible privacy summary across the editor and engineering pages",
                "Clarified that QR content and selected images stay on-device while Cloudflare can observe connection metadata",
                "Synchronized version, Shadow Log, donation, and support surfaces across every QR page"
            ]
        },
        {
            version: "0.5.0",
            date: "2026-05-31",
            changes: [
                "Reworked BG, Paper, Ink, and Logo image handling with clearer default sizing and layer proportions",
                "Paper now expands around the ink area, while Background uses a larger outer frame for more predictable composition",
                "Added image thumbnails and quick remove controls for BG, Paper, Ink, and Logo slots",
                "Added Logo fit controls so placed images can fill, cover, or contain the logo area",
                "Added PNG, JPEG, WEBP, SVG, and PDF download options with selectable export sizes",
                "Improved QR style presets, liquid/blur filters, color controls, and gradient behavior",
                "Rebuilt brand logos from deterministic SVG path data with high-resolution WebGL textures and clean contain/reset behavior",
                "Fixed BG visibility, logo container toggling, conic gradient seams, and brand logo preview pixelation",
                "Fixed styled QR copy/export so the generated PNG preserves the visible image, shapes, layers, and WebGL effects",
                "Added a permission-safe copy fallback that shows the generated PNG instead of copying plain text when the browser blocks image clipboard writes",
                "Cleaned project documentation and LLM-facing context files for clearer handoff and project missions"
            ]
        },
        {
            version: "0.4.0",
            date: "2026-03-11",
            changes: [
                "Scan Tool: Uploading an image to the Scanner now intelligently displays a preview of the image above the decoded text",
                "Improved rendering performance by optimizing WASM payload configuration (wasm-opt) and allocation strategies",
                "Now uses the modern native BarcodeDetector API for scanning, falling back to a performant WASM-based ZXing decoder",
                "UX: Added smart Z-Index management so active floating panels naturally come to the foreground on click",
                "UX: Uploading a Custom Background image now automatically conceals the Paper layer to guarantee immediate visibility",
                "UX: Advanced Mask Patterns are now labeled with human-readable descriptions rather than mathematical notation",
                "Editor: Removed the redundant 'Layers' panel entirely. Transparency and visibility layers are now fully managed natively within the 'Image' panel",
                "Removed obsolete wee_alloc from WASM crates in favor of the default performant memory allocator",
                "Removed legacy jsqr dependency from the frontend, dropping main-thread execution weight"
            ]
        },
        {
            version: "0.3.0",
            date: "2026-02-08",
            changes: [
                "Refined body/eye shapes and improved readability behavior",
                "Toolbar UX upgrades: one-tap export flow, cleaner menu interactions, and better feedback",
                "Added SEO refresh and llms.txt support for better discoverability"
            ]
        },
        {
            version: "0.2.1",
            date: "2026-01-22",
            changes: [
                "Implemented strict 5-layer renderer (Card UI base + BG, Paper, Ink, Logo)",
                "Image slots now support BG/Paper/Ink/Logo with transforms + opacity",
                "Rebuilt shapes system (10 body + 10 eye frame + 10 eye ball) with improved icons",
                "Added 'alive' body shapes with neighbor/corner-aware chaining and tuned readability",
                "Fixed verifier: now re-checks on any visual change (including shapes)",
                "Fixed QR scan tool showing '[object Promise]' and improved type dropdown behavior"
            ]
        },
        {
            version: "0.2.0",
            date: "2026-01-17",
            changes: [
                "i18n migration + English/Spanish support",
                "SVG export is now real vector SVG (not a PNG embedded in SVG)",
                "Unified wasm-qr-svg loading with a single dynamic loader (removed mixed import warning)",
                "Added JPEG download option and improved export pipeline consistency",
                "Fixed Image panel: logo/background selection no longer mixes images; background + logo can coexist",
                "Improved perceived performance with idle-time WASM prefetch on first user intent"
            ]
        },
        {
            version: "0.1.1",
            date: "2026-01-12",
            changes: [
                "Fixed WebGL shader compilation errors",
                "Resolved 'Outdated Optimize Dep' issues"
            ]
        },
        {
            version: "0.1.0",
            date: "2026-01-12",
            changes: [
                "Profound WASM optimization (reduced to ~30kb)",
                "Fixed white background issue",
                "Removed legacy jsPDF dependency",
                "Theme support implementation"
            ]
        }
    ],
    es: [
        {
            version: "1.0.2",
            date: "2026-09-04",
            changes: [
                "Corregida la vista previa y las exportaciones PNG, JPG, WebP y PDF, que salían invertidas verticalmente: los ojos quedan arriba-izquierda, arriba-derecha y abajo-izquierda como en el SVG, y los módulos Agua, el ojo Corazón y el marco Hoja se ven como en sus miniaturas de Formas",
                "La comprobación de legibilidad espera a que carguen las formas elegidas antes de capturar, así su veredicto siempre corresponde al estilo actual",
                "El modo escaneo se puede cerrar de nuevo (botón o Escape), vuelve a donde estabas y en móviles lleva directo a la zona para soltar la imagen",
                "El escáner conserva sus textos traducidos en todos los estados, explica qué hacer en el escenario y prueba el detector nativo del navegador antes del decodificador local en Rust para fotos de cámara"
            ]
        },
        {
            version: "1.0.1",
            date: "2026-09-04",
            changes: [
                "Separados los controles para contraer Contenido y Estilo, con etiquetas accesibles sincronizadas al contraer y mostrar",
                "Eliminado el hueco móvil involuntario que provocaba la polilla decorativa al participar en el layout",
                "Centradas las pestañas de herramientas en móviles conservando el desplazamiento horizontal en pantallas estrechas y traducciones largas"
            ]
        },
        {
            version: "1.0.0",
            date: "2026-09-04",
            changes: [
                "QR reconstruido como espacio de trabajo: riel de contenido, escenario en vivo y pestañas de estilo ancladas (Colores, Formas, Efectos, Imagen, Marco, Avanzado) con hoja inferior en móviles",
                "Adoptada la paleta editorial cálida de Holi y Noto Sans; fondos de previsualización claro, oscuro y transparente, más zoom",
                "Nuevos estilos guardados (locales al navegador) con importación y exportación JSON, y enlaces de estilo que viajan solo en el fragmento de la URL",
                "Nuevo marco de texto opcional (\"Escanéame\") incluido al exportar PNG, JPG, WebP, PDF y SVG",
                "Rediseñados los módulos Cápsula, Cadena, Agua y Pixel, los marcos de ojo Diamante y Trébol, y las pupilas Cuadrícula, Estrella y Diamante para que coincidan con su nombre y conserven la proporción escaneable del patrón de posición",
                "Las fichas de formas muestran la geometría exacta del renderizador; el marco Diamante avisa qué pupilas siguen siendo escaneables",
                "Atajos de teclado: Ctrl+S descargar, Ctrl+Shift+C copiar, 1–6 cambiar de pestaña",
                "Eliminados los paneles flotantes arrastrables y la barra lateral heredada"
            ]
        },
        {
            version: "0.9.1",
            date: "2026-09-02",
            changes: [
                "Añadido el sketch transparente de una polilla como identidad discreta de QR",
                "Movidos el descubrimiento y la propiedad canónica de Papers a Holi Labs",
                "Conservadas las URLs antiguas de QR como redirecciones a la lectura localizada de Labs"
            ]
        },
        {
            version: "0.9.0",
            date: "2026-09-02",
            changes: [
                "Eliminado el brillo exterior inestable del dock compartido",
                "Traducidos los datos de privacidad de QR y todos los controles compartidos a los siete idiomas soportados",
                "Publicados el índice y el artículo técnico completos en los siete idiomas soportados"
            ]
        },
        {
            version: "0.8.0",
            date: "2026-09-02",
            changes: [
                "Corregidos logos de marca, Generar, Shapes, Colors, Advanced, selectores y menús de exportación en tema claro",
                "Eliminados overrides del sistema que podían volver ilegibles los controles después de elegir un tema de Holi",
                "El dock de producto y las tarjetas compartidas ahora heredan la paleta QR activa"
            ]
        },
        {
            version: "0.7.0",
            date: "2026-09-02",
            changes: [
                "Unificadas Configuración, Versiones y Privacidad en el dock compartido de productos Holi",
                "Añadidas preferencias locales de tema e idioma y navegación de QR dentro de Configuración",
                "Integrados donaciones, soporte y el Shadow Log visible dentro de Versiones"
            ]
        },
        {
            version: "0.6.1",
            date: "2026-09-02",
            changes: [
                "Separados privacidad y Version Log en controles flotantes equivalentes",
                "Movidos los detalles de privacidad a un panel propio y eliminada la barra completa del footer"
            ]
        },
        {
            version: "0.6.0",
            date: "2026-09-02",
            changes: [
                "Añadido un resumen de privacidad visible en el editor y las páginas de ingeniería",
                "Aclarado que el contenido del QR y las imágenes elegidas permanecen en el dispositivo mientras Cloudflare puede observar metadata de conexión",
                "Sincronizadas la versión, Shadow Log, donaciones y soporte en todas las páginas de QR"
            ]
        },
        {
            version: "0.5.0",
            date: "2026-05-31",
            changes: [
                "Rehecho el manejo de imagenes en BG, Papel, Ink y Logo con tamanos base mas claros y proporciones de capa mas predecibles",
                "Papel ahora crece alrededor del area de tinta, mientras Background usa un marco exterior mas amplio para componer mejor",
                "Anadidos thumbnails y controles rapidos para quitar imagenes en BG, Papel, Ink y Logo",
                "Anadidos controles de ajuste del Logo para rellenar, cubrir o contener la imagen colocada",
                "Anadidas opciones de descarga PNG, JPEG, WEBP, SVG y PDF con tamanos de exportacion seleccionables",
                "Mejorados los estilos de QR, filtros liquid/blur, controles de color y comportamiento de degradados",
                "Logos de marca rehechos desde paths SVG deterministas con texturas WebGL de alta resolucion y ajuste contain limpio",
                "Arreglada la visibilidad de BG, el toggle del contenedor de logo, el corte del degradado conico y el pixelado del preview de logos",
                "Arreglada la copia/exportacion de QRs estilizados para que el PNG conserve imagen, formas, capas y efectos WebGL visibles",
                "Anadido fallback seguro para copia: si el navegador bloquea copiar imagenes, muestra el PNG generado en vez de copiar texto plano",
                "Limpieza de documentacion y contexto para modelos de lenguaje, con misiones y especificaciones del proyecto mas ordenadas"
            ]
        },
        {
            version: "0.4.0",
            date: "2026-03-11",
            changes: [
                "Herramienta de Escaneo: Subir una imagen al escáner ahora muestra una vista previa arriba del texto decodificado",
                "Rendimiento de renderizado mejorado optimizando la configuración del binario WASM y la asignación en memoria",
                "Ahora utiliza la BarcodeDetector API nativa para escanear, con fallback a un decoder ZXing veloz en WASM",
                "UX: Manejo de Z-Index para que los paneles flotantes siempre pasen al frente al interactuar",
                "UX: Subir una imagen de fondo (Background) oculta automáticamente el papel (Paper) para darle visibilidad",
                "UX: Las Máscaras (Mask Patterns) avanzadas ahora tienen nombres descriptivos en lugar de numéricos",
                "Editor: Eliminado el panel de 'Capas' (Layers). La transparencia se controla completamente desde el panel 'Imagen'",
                "Eliminada la dependencia legacy jsqr del frontend, aliviando la carga del thread principal",
                "Eliminado wee_alloc obsoleto del stack rust-wasm"
            ]
        },
        {
            version: "0.3.0",
            date: "2026-02-08",
            changes: [
                "Refinadas las shapes de body/eyes y mejorado el comportamiento de legibilidad",
                "Mejoras UX del toolbar: flujo de exportación en un toque, interacciones más limpias del menú y mejor feedback",
                "Actualización SEO y soporte de llms.txt para mejor descubribilidad"
            ]
        },
        {
            version: "0.2.1",
            date: "2026-01-22",
            changes: [
                "Implementado renderer estricto de 5 capas (Card base UI + BG, Paper, Ink, Logo)",
                "Slots de imagen para BG/Paper/Ink/Logo con transformaciones + opacidad",
                "Sistema de shapes rehecho (10 body + 10 eye frame + 10 eye ball) con mejores iconos",
                "Añadidas shapes 'vivas' con lógica de vecinos/esquinas y legibilidad ajustada",
                "Arreglado verificador: ahora valida con cualquier cambio visual (incluye shapes)",
                "Arreglado el escáner (ya no muestra '[object Promise]') y mejorado el dropdown de tipo"
            ]
        },
        {
            version: "0.2.0",
            date: "2026-01-17",
            changes: [
                "migración a i18 y soporte de español e inglés",
                "Export de SVG ahora es SVG vectorial real (no PNG embebido en SVG)",
                "Carga unificada de wasm-qr-svg con loader dinámico único (se elimina warning por imports mixtos)",
                "Añadida descarga en JPEG y mejoras de consistencia en el pipeline de export",
                "Arreglado panel Image: logo/background ya no se mezclan; background + logo pueden coexistir",
                "Mejoras de rendimiento percibido con prefetch de WASM en idle tras intención del usuario"
            ]
        },
        {
            version: "0.1.1",
            date: "2026-01-12",
            changes: [
                "Arreglados errores de compilación de shaders WebGL",
                "Resuelto problemas de dependencias optimizadas"
            ]
        },
        {
            version: "0.1.0",
            date: "2026-01-12",
            changes: [
                "Optimización profunda de WASM (reducido a ~30kb)",
                "Arreglado problema de fondo blanco",
                "Eliminada dependencia legacy jsPDF",
                "Implementación de soporte de temas"
            ]
        }
    ]
};

const localizedQrPatchChanges: Record<string, string[]> = {
    zh: [
        "“内容”和“样式”的折叠控制现在彼此独立，并会同步更新无障碍的收起和展开标签",
        "修复了装饰性飞蛾参与工作区布局而造成的移动端多余空白",
        "移动端工具标签现在居中；在更窄屏幕和较长译文中仍可横向滚动"
    ],
    hi: [
        "कंटेंट और स्टाइल को समेटने वाले नियंत्रण अब स्वतंत्र हैं, और उनके सुलभ समेटें और दिखाएँ लेबल स्थिति के साथ अपडेट होते हैं",
        "वर्कस्पेस लेआउट में सजावटी पतंगे के शामिल होने से बना अनचाहा मोबाइल खाली स्थान हटाया",
        "मोबाइल टूल टैब को केंद्र में रखा, जबकि संकरी स्क्रीन और लंबे अनुवादों के लिए क्षैतिज स्क्रॉल बना रहता है"
    ],
    ar: [
        "أصبحت عناصر طيّ المحتوى والنمط مستقلة، مع مزامنة تسميات الطيّ والإظهار المخصّصة لإمكانية الوصول",
        "أزيل الفراغ غير المقصود على الهاتف الذي نتج عن مشاركة رسمة العثّة الزخرفية في تخطيط مساحة العمل",
        "وُسّطت تبويبات الأدوات على الهاتف مع الحفاظ على التمرير الأفقي للشاشات الأضيق والترجمات الأطول"
    ],
    bn: [
        "কনটেন্ট ও স্টাইল গুটানোর নিয়ন্ত্রণ এখন আলাদা, এবং অ্যাক্সেসিবল গুটান ও দেখান লেবেল অবস্থার সঙ্গে সিঙ্ক হয়",
        "ডেকোরেটিভ মথ ওয়ার্কস্পেস লেআউটে জায়গা নেওয়ায় মোবাইলে তৈরি হওয়া অনাকাঙ্ক্ষিত ফাঁকা স্থান সরানো হয়েছে",
        "মোবাইল টুল ট্যাবগুলো মাঝখানে রাখা হয়েছে; সরু স্ক্রিন ও দীর্ঘ অনুবাদে অনুভূমিক স্ক্রল বজায় থাকে"
    ],
    pt: [
        "Separados os controles de recolher Conteúdo e Estilo, com os rótulos acessíveis de recolher e mostrar sincronizados",
        "Removido o espaço vazio indesejado no celular causado pela mariposa decorativa ocupar espaço no layout",
        "Centralizadas as abas de ferramentas no celular, mantendo a rolagem horizontal em telas estreitas e traduções longas"
    ]
};

const localizedQrPatch102Changes: Record<string, string[]> = {
    zh: [
        "修复了实时预览及 PNG、JPG、WebP 和 PDF 导出被上下镜像的问题：定位眼现在与 SVG 一样位于左上、右上和左下，水滴模块、心形眼和叶形边框也与“形状”缩略图一致",
        "可读性检查会先等所选形状加载完成再截图，因此结果始终对应当前样式",
        "扫描模式可以再次关闭（按钮或 Escape），会返回原来的位置，在手机上会直接滚动到图片拖放区",
        "扫描器在每个状态都保留已翻译的文案，在舞台上说明该做什么，并在使用本地 Rust 解码器之前先尝试浏览器的原生检测器来处理相机照片"
    ],
    hi: [
        "लाइव प्रीव्यू और PNG, JPG, WebP व PDF एक्सपोर्ट का ऊपर-नीचे उलटा दिखना ठीक किया: फाइंडर आँखें अब SVG की तरह ऊपर-बाएँ, ऊपर-दाएँ और नीचे-बाएँ रहती हैं, और Water मॉड्यूल, Heart आँख और Leaf फ़्रेम वैसे ही दिखते हैं जैसे Shapes की टाइलों में",
        "पठनीयता जाँच अब चुनी हुई आकृतियाँ लोड होने तक इंतज़ार करके कैप्चर करती है, इसलिए उसका नतीजा हमेशा मौजूदा स्टाइल का होता है",
        "स्कैन मोड फिर से बंद किया जा सकता है (बटन या Escape), आप जहाँ थे वहीं लौटता है, और फ़ोन पर सीधे इमेज ड्रॉप ज़ोन तक स्क्रॉल करता है",
        "स्कैनर हर स्थिति में अपने अनुवादित टेक्स्ट रखता है, स्टेज पर बताता है कि क्या करना है, और कैमरा फ़ोटो के लिए लोकल Rust डिकोडर से पहले ब्राउज़र का नेटिव डिटेक्टर आज़माता है"
    ],
    ar: [
        "أُصلحت المعاينة الحية وتصديرات PNG وJPG وWebP وPDF التي كانت تظهر مقلوبة رأسيًا: تستقر عيون التحديد الآن أعلى اليسار وأعلى اليمين وأسفل اليسار كما في SVG، وتظهر وحدات الماء وعين القلب وإطار الورقة كما في مصغّرات الأشكال",
        "ينتظر فحص القابلية للقراءة تحميل الأشكال المختارة قبل الالتقاط، فيعبّر حكمه دائمًا عن النمط الحالي",
        "يمكن إغلاق وضع المسح مجددًا (بالزر أو Escape)، ويعود إلى حيث كنت، وعلى الهاتف ينتقل مباشرة إلى منطقة إفلات الصورة",
        "يحتفظ الماسح بنصوصه المترجمة في كل حالة، ويشرح على المسرح ما ينبغي فعله، ويجرّب كاشف المتصفح الأصلي قبل وحدة فك الترميز المحلية بلغة Rust لصور الكاميرا"
    ],
    bn: [
        "লাইভ প্রিভিউ এবং PNG, JPG, WebP ও PDF এক্সপোর্ট উল্টো (উপর-নিচ) হয়ে যাওয়ার সমস্যা ঠিক করা হয়েছে: ফাইন্ডার চোখগুলো এখন SVG-এর মতোই উপরে-বামে, উপরে-ডানে ও নিচে-বামে থাকে, আর Water মডিউল, Heart চোখ ও Leaf ফ্রেম Shapes টাইলের মতোই দেখায়",
        "পঠনযোগ্যতা পরীক্ষা এখন নির্বাচিত আকৃতি লোড হওয়া পর্যন্ত অপেক্ষা করে ক্যাপচার নেয়, তাই এর রায় সবসময় বর্তমান স্টাইলের",
        "স্ক্যান মোড আবার বন্ধ করা যায় (বোতাম বা Escape), আপনি যেখানে ছিলেন সেখানে ফিরে যায়, আর ফোনে সরাসরি ছবি ড্রপ করার জায়গায় স্ক্রল করে",
        "স্ক্যানার প্রতিটি অবস্থায় অনূদিত লেখা বজায় রাখে, স্টেজে কী করতে হবে তা জানায়, এবং ক্যামেরার ছবির জন্য লোকাল Rust ডিকোডারের আগে ব্রাউজারের নেটিভ ডিটেক্টর চেষ্টা করে"
    ],
    pt: [
        "Corrigida a pré-visualização e as exportações PNG, JPG, WebP e PDF, que saíam espelhadas na vertical: os olhos ficam no canto superior esquerdo, superior direito e inferior esquerdo como no SVG, e os módulos Água, o olho Coração e a moldura Folha aparecem como nas miniaturas de Formas",
        "A verificação de legibilidade espera as formas escolhidas carregarem antes de capturar, então o veredito sempre corresponde ao estilo atual",
        "O modo de leitura pode ser fechado de novo (botão ou Escape), volta para onde você estava e, no celular, rola direto até a área para soltar a imagem",
        "O leitor mantém os textos traduzidos em todos os estados, explica o que fazer no palco e tenta o detector nativo do navegador antes do decodificador local em Rust para fotos de câmera"
    ]
};

for (const [locale, changes] of Object.entries(localizedQrPatchChanges)) {
    qrAppChangelog[locale] = [
        { version: "1.0.2", date: "2026-09-04", changes: localizedQrPatch102Changes[locale] ?? qrAppChangelog.en[0].changes },
        { version: "1.0.1", date: "2026-09-04", changes },
        ...qrAppChangelog.en.slice(2)
    ];
}

export const labsAppChangelog: LocalizedChangelog = {
    en: [
        {
            version: "0.6.0",
            date: "2026-09-02",
            changes: [
                "Defined Tutorials, Field notes, Experiments, and Papers as formats in one Holi Labs publication",
                "Added a localized Papers collection with a subtle crane category mark across all seven languages",
                "Added format filters and the axolotl identity while preserving one shared library and privacy shell"
            ]
        },
        {
            version: "0.5.0",
            date: "2026-09-02",
            changes: [
                "Extended the Labs library shell, privacy summary, search, filters, and article routes to all seven Holi languages",
                "Localized the shared product dock and removed its unstable outer glow",
                "Kept code blocks, URLs, file paths, and technical product names intact across translated tutorials"
            ]
        },
        {
            version: "0.4.0",
            date: "2026-09-02",
            changes: [
                "Rebuilt Labs as a practical library with featured reading, search, category filters, and reading time",
                "Published seven complete English and Spanish tutorials, guides, and engineering notes",
                "Added coherent light and dark Labs palettes and limited public routes to fully translated locales"
            ]
        },
        {
            version: "0.3.0",
            date: "2026-09-02",
            changes: [
                "Unified Configuration, Versions, and Privacy in the shared Holi product dock",
                "Added local theme and language preferences plus Labs navigation inside Configuration",
                "Placed donations, support, and the visible Shadow Log inside Versions"
            ]
        },
        {
            version: "0.2.1",
            date: "2026-09-02",
            changes: [
                "Separated privacy and Version Log into left and right floating controls",
                "Moved privacy facts into a dedicated glass drawer"
            ]
        },
        {
            version: "0.2.0",
            date: "2026-09-02",
            changes: [
                "Added a visible privacy summary to experiment, article, and tag pages",
                "Made the current version and Shadow Log available throughout Labs",
                "Reframed Labs as a research publication rather than a product backlog"
            ]
        },
        {
            version: "0.1.1",
            date: "2026-01-12",
            changes: ["Added English and Spanish routes", "Synchronized the content collection", "Improved stability"]
        },
        {
            version: "0.1.0",
            date: "2026-01-12",
            changes: ["Created the first Labs content collection", "Published initial graphics and performance notes"]
        }
    ],
    es: [
        {
            version: "0.6.0",
            date: "2026-09-02",
            changes: [
                "Definidos Tutoriales, Notas de campo, Experimentos y Papers como formatos de una sola publicación Holi Labs",
                "Añadida una colección Papers localizada con una grulla discreta en los siete idiomas",
                "Añadidos filtros de formato y la identidad del ajolote conservando una sola biblioteca y shell de privacidad"
            ]
        },
        {
            version: "0.5.0",
            date: "2026-09-02",
            changes: [
                "Extendidos el shell, privacidad, búsqueda, filtros y rutas de artículos de Labs a los siete idiomas de Holi",
                "Traducido el dock compartido y eliminado su brillo exterior inestable",
                "Conservados bloques de código, URLs, rutas y nombres técnicos en los tutoriales traducidos"
            ]
        },
        {
            version: "0.4.0",
            date: "2026-09-02",
            changes: [
                "Labs fue rehecho como biblioteca práctica con lectura destacada, búsqueda, filtros y tiempo de lectura",
                "Publicados siete tutoriales, guías y notas técnicas completos en español e inglés",
                "Añadidas paletas clara y oscura coherentes y limitadas las rutas públicas a idiomas completos"
            ]
        },
        {
            version: "0.3.0",
            date: "2026-09-02",
            changes: [
                "Unificadas Configuración, Versiones y Privacidad en el dock compartido de Holi",
                "Añadidas preferencias locales de tema e idioma y navegación de Labs",
                "Integrados donaciones, soporte y Shadow Log dentro de Versiones"
            ]
        },
        {
            version: "0.2.1",
            date: "2026-09-02",
            changes: ["Separados privacidad y Version Log en controles flotantes", "Movidos los datos de privacidad a un panel dedicado"]
        },
        {
            version: "0.2.0",
            date: "2026-09-02",
            changes: [
                "Añadido un resumen visible de privacidad en artículos y tags",
                "Disponible la versión y Shadow Log en todo Labs",
                "Labs pasó de backlog a publicación de investigación"
            ]
        },
        {
            version: "0.1.1",
            date: "2026-01-12",
            changes: ["Añadidas rutas en español e inglés", "Sincronizada la colección de contenido", "Mejorada la estabilidad"]
        },
        {
            version: "0.1.0",
            date: "2026-01-12",
            changes: ["Creada la primera colección de Labs", "Publicadas las primeras notas de gráficos y rendimiento"]
        }
    ]
};

export const testAppChangelog: VersionEntry[] = [
    {
        version: "0.0.1",
        date: "2024-01-12",
        changes: [
            "Initial Design System prototype",
            "Added Version Control UI system",
            "Implemented GlassCard intensity and alignment fixes"
        ]
    }
];

export const userAppChangelog: LocalizedChangelog = {
    en: [
        {
            version: "0.3.0",
            date: "2026-09-02",
            changes: [
                "Replaced five English fallbacks with complete Chinese, Hindi, Arabic, Bengali, and Portuguese interface catalogs",
                "Localized chat, file, privacy, accessibility, donation, support, and product-dock surfaces",
                "Removed the unstable outer glow from the shared product dock"
            ]
        },
        {
            version: "0.2.1",
            date: "2026-09-02",
            changes: [
                "Made the shared dock inherit the active Vault light or dark palette",
                "Aligned shared card borders and surfaces with the explicit Holi theme"
            ]
        },
        {
            version: "0.2.0",
            date: "2026-09-02",
            changes: [
                "Unified Configuration, Versions, and Privacy in the shared Holi product dock",
                "Added local theme and language preferences plus vault navigation inside Configuration",
                "Placed donations, support, and the visible Shadow Log inside Versions"
            ]
        },
        {
            version: "0.1.1",
            date: "2026-09-02",
            changes: [
                "Separated privacy and Version Log into matching floating controls",
                "Moved vault privacy boundaries into a dedicated details drawer"
            ]
        },
        {
            version: "0.1.0",
            date: "2026-09-02",
            changes: [
                "Added a privacy summary to every vault, contact, and conversation route",
                "Clarified local storage, direct peer address exposure, provider metadata, and current encryption boundaries",
                "Positioned User as an experimental collaboration client that is never required by other Holi tools"
            ]
        },
        {
            version: "0.0.1",
            date: "2026-01-17",
            changes: [
                "i18n migration + English/Spanish support",
                "Initial Holi Vault release",
                "Added configuration menu + language routing support",
                "Added versions (changelog) overlay"
            ]
        }
    ],
    es: [
        {
            version: "0.3.0",
            date: "2026-09-02",
            changes: [
                "Reemplazados cinco fallbacks en inglés por catálogos completos en chino, hindi, árabe, bengalí y portugués",
                "Traducidas las superficies de chat, archivos, privacidad, accesibilidad, donación, soporte y dock",
                "Eliminado el brillo exterior inestable del dock compartido"
            ]
        },
        {
            version: "0.2.1",
            date: "2026-09-02",
            changes: [
                "El dock compartido ahora hereda la paleta clara u oscura activa del Vault",
                "Alineados bordes y superficies compartidas con el tema explícito de Holi"
            ]
        },
        {
            version: "0.2.0",
            date: "2026-09-02",
            changes: [
                "Unificadas Configuración, Versiones y Privacidad en el dock compartido de productos Holi",
                "Añadidas preferencias locales de tema e idioma y navegación del vault dentro de Configuración",
                "Integrados donaciones, soporte y el Shadow Log visible dentro de Versiones"
            ]
        },
        {
            version: "0.1.1",
            date: "2026-09-02",
            changes: [
                "Separados privacidad y Version Log en controles flotantes equivalentes",
                "Movidos los límites de privacidad del vault a un panel propio de detalles"
            ]
        },
        {
            version: "0.1.0",
            date: "2026-09-02",
            changes: [
                "Añadido un resumen de privacidad en todas las rutas de vault, contactos y conversaciones",
                "Aclarados el almacenamiento local, la exposición de direcciones entre pares, la metadata de proveedores y los límites actuales del cifrado",
                "Holi User queda como cliente experimental de colaboración y nunca es requisito para las demás herramientas"
            ]
        },
        {
            version: "0.0.1",
            date: "2026-01-17",
            changes: [
                "migración a i18 y soporte de español e inglés",
                "Release inicial de Holi Vault",
                "Añadido menú de configuración + soporte de rutas por idioma",
                "Añadido overlay de versiones (changelog)"
            ]
        }
    ]
};
