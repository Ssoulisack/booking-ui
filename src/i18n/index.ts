import i18n from "i18next"
import { initReactI18next } from "react-i18next"

import enCommon from "./locales/en/common.json"
import enErrors from "./locales/en/errors.json"
import loCommon from "./locales/lo/common.json"
import loErrors from "./locales/lo/errors.json"
import thCommon from "./locales/th/common.json"
import thErrors from "./locales/th/errors.json"

export const LANGUAGES = ["en", "lo", "th"] as const
export type Language = (typeof LANGUAGES)[number]

const STORAGE_KEY = "booking.lang"

// a visitor who never picked a language: the website starts in Lao (the customers are in Laos); the backoffice
// keeps English. On a business's page its own language setting comes next (applyBusinessLanguage).
const DEFAULT_LANGUAGE: Language =
  import.meta.env.MODE === "admin" ? "en" : "lo"

function savedLanguage(): Language {
  let saved: string | null = null
  try {
    saved = localStorage.getItem(STORAGE_KEY)
  } catch {
    // storage blocked (private mode): the default
  }
  return LANGUAGES.includes(saved as Language)
    ? (saved as Language)
    : DEFAULT_LANGUAGE
}

// Lao and Thai have no singular/plural, so their files only have the `_other` form of a plural key. Anything
// missing from a Lao or Thai file falls back to English (the legal pages are English for now).
void i18n.use(initReactI18next).init({
  resources: {
    en: { common: enCommon, errors: enErrors },
    lo: { common: loCommon, errors: loErrors },
    th: { common: thCommon, errors: thErrors },
  },
  lng: savedLanguage(),
  fallbackLng: "en",
  supportedLngs: LANGUAGES,
  ns: ["common", "errors"],
  defaultNS: "common",
  interpolation: { escapeValue: false },
  returnEmptyString: false,
})

i18n.on("languageChanged", (lng) => {
  document.documentElement.lang = lng
})
document.documentElement.lang = i18n.language

/** A language the visitor picked themselves: remembered, and wins over a business's language */
export function chooseLanguage(lng: Language) {
  localStorage.setItem(STORAGE_KEY, lng)
  void i18n.changeLanguage(lng)
}

/** On a public page: use the business's language unless the visitor picked one */
export function applyBusinessLanguage(lng: string) {
  if (localStorage.getItem(STORAGE_KEY)) return
  const supported = LANGUAGES.includes(lng as Language) ? lng : DEFAULT_LANGUAGE
  if (i18n.language !== supported) void i18n.changeLanguage(supported)
}

export default i18n
