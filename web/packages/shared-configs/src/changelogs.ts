export interface VersionEntry {
    version: string;
    date: string;
    changes: string[];
}

export type LocalizedChangelog = Record<string, VersionEntry[]>;

export const mainAppChangelog: LocalizedChangelog = {
    en: [
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

export const qrAppChangelog: LocalizedChangelog = {
    en: [
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

export const labsAppChangelog: VersionEntry[] = [
    {
        version: "0.1.1",
        date: "2026-01-12",
        changes: [
            "i18n migration + English/Spanish support",
            "Sync with core library updates",
            "General stability improvements"
        ]
    },
    {
        version: "0.1.0",
        date: "2026-01-12",
        changes: [
            "Initial implementation of content collections",
            "WebGPU Shaders integration",
            "Performance experiments"
        ]
    }
];

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
