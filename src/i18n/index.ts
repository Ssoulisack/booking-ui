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

function savedLanguage(): Language {
  const saved = localStorage.getItem(STORAGE_KEY)
  return LANGUAGES.includes(saved as Language) ? (saved as Language) : "en"
}

// Lao and Thai files are empty for now: every missing text falls back to English
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
  const supported = LANGUAGES.includes(lng as Language) ? lng : "en"
  if (i18n.language !== supported) void i18n.changeLanguage(supported)
}

export default i18n
