export const translations = {
    en: {
        meta_title: "Holi Test - Component Showcase",
        meta_description: "Design system validation and component library manual.",
        title: "holi test",
        subtitle: "Component library & implementation manual.",
        sections: {
            typography: "Typography",
            colors: "Colors",
            buttons: "Buttons",
            inputs: "Inputs & Forms",
            cards: "Cards & Glass",
        }
    },
    es: {
        meta_title: "Holi Test - Catálogo de Componentes",
        meta_description: "Validación del sistema de diseño y manual de componentes.",
        title: "holi test",
        subtitle: "Biblioteca de componentes y manual de implementación.",
        sections: {
            typography: "Tipografía",
            colors: "Colores",
            buttons: "Botones",
            inputs: "Entradas y Formularios",
            cards: "Tarjetas y Glass",
        }
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
