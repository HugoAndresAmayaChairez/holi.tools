export const translations = {
    en: {
        meta_title: "Holi Typst - Document Editor",
        meta_description: "Professional medical and scientific document editing with real-time preview.",
        hero_title: "holi typst",
        hero_slogan: "Professional document editing. Real-time preview. Medical & Scientific focus.",
        coming_soon: "Coming Soon",
        back_home: "Back to Holi.tools",
    },
    es: {
        meta_title: "Holi Typst - Editor de Documentos",
        meta_description: "Edición profesional de documentos médicos y científicos con vista previa en tiempo real.",
        hero_title: "holi typst",
        hero_slogan: "Edición profesional de documentos. Vista previa en tiempo real. Enfoque médico y científico.",
        coming_soon: "Próximamente",
        back_home: "Volver a Holi.tools",
    },
} as const;

export type Language = "en" | "es" | "fr" | "de" | "pt" | "it" | "zh" | "ja" | "ko" | "ru";

export const languages = [
    { code: "en", name: "English" },
    { code: "es", name: "Español" },
    { code: "fr", name: "Français" },
    { code: "de", name: "Deutsch" },
    { code: "pt", name: "Português" },
    { code: "it", name: "Italiano" },
    { code: "zh", name: "中文" },
    { code: "ja", name: "日本語" },
    { code: "ko", name: "한국어" },
    { code: "ru", name: "Русский" },
] as const;

export function getTranslations(lang: string) {
    const t = translations[lang as keyof typeof translations] || translations.en;
    return { ...translations.en, ...t };
}
