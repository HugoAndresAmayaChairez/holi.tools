export const SUPPORTED_LANGS = ["en", "es", "zh", "hi", "ar", "bn", "pt"] as const;
export const DEFAULT_LANG = "en";

export type LanguageCode = (typeof SUPPORTED_LANGS)[number];

export const LANGUAGES = [
    { code: "en", name: "English" },
    { code: "es", name: "Español" },
    { code: "zh", name: "中文" },
    { code: "hi", name: "हिन्दी" },
    { code: "ar", name: "العربية" },
    { code: "bn", name: "বাংলা" },
    { code: "pt", name: "Português" },
] as const;
