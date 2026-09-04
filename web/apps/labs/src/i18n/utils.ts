import { ui, type TranslationKey } from "./ui";
import { DEFAULT_LANG, LANGUAGES, SUPPORTED_LANGS } from "@holi/configs/i18n";

export function getLangFromUrl(url: URL) {
    const [, lang] = url.pathname.split("/");
    if (SUPPORTED_LANGS.includes(lang as (typeof SUPPORTED_LANGS)[number])) {
        return lang as keyof typeof ui;
    }
    return DEFAULT_LANG as keyof typeof ui;
}

export function useTranslations(lang: keyof typeof ui) {
    return function t(key: TranslationKey) {
        return ui[lang][key] || ui[DEFAULT_LANG][key];
    };
}

export const languages = LANGUAGES;
