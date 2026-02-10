export const SUPPORTED_LANGS = ["en", "es"] as const;
export const DEFAULT_LANG = "en";

export type LanguageCode = (typeof SUPPORTED_LANGS)[number];

export const LANGUAGES = [
    { code: "en", name: "English" },
    { code: "es", name: "Español" },
] as const;
