import i18n, { type TFunction } from "i18next"

import { ApiError } from "@/lib/api/client"

// Codes that carry a value after a fixed prefix, e.g. SLOT_NOT_AVAILABLE_ON_2026-11-02
const PREFIXED: Array<{
  prefix: string
  key: string
  params: (rest: string, t: TFunction) => Record<string, string>
}> = [
  {
    prefix: "SLOT_NOT_AVAILABLE_ON_",
    key: "SLOT_NOT_AVAILABLE_ON",
    params: (rest) => ({ date: rest }),
  },
]

/** The backend code behind any thrown value */
export function errorCode(err: unknown): string {
  if (err instanceof ApiError) return err.code
  return "UNKNOWN"
}

/** A readable sentence for an API error code, in the current language */
export function codeMessage(code: string, t: TFunction): string {
  if (i18n.exists(`errors:${code}`)) return t(`errors:${code}`, { code })
  for (const p of PREFIXED) {
    if (code.startsWith(p.prefix)) {
      return t(`errors:${p.key}`, p.params(code.slice(p.prefix.length), t))
    }
  }
  return t("errors:UNKNOWN", { code })
}

/** A readable sentence for any thrown value */
export function errorMessage(err: unknown, t: TFunction): string {
  return codeMessage(errorCode(err), t)
}
