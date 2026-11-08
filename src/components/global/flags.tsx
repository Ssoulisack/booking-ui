import { useId } from "react"

import type { Language } from "@/i18n"
import { cn } from "@/lib/utils"

/** A national flag drawn as SVG (emoji flags show as two letters on Windows): UK for English, Laos, Thailand */
export function Flag({
  language,
  className,
}: {
  language: Language
  className?: string
}) {
  const id = useId()
  const box = cn(
    "block h-[14px] w-5 shrink-0 rounded-[3px] ring-1 ring-black/15",
    className,
  )
  if (language === "lo")
    return (
      <svg viewBox="0 0 30 20" className={box} aria-hidden="true">
        <rect width="30" height="20" fill="#CE1126" />
        <rect y="5" width="30" height="10" fill="#002868" />
        <circle cx="15" cy="10" r="4" fill="#fff" />
      </svg>
    )
  if (language === "th")
    return (
      <svg viewBox="0 0 9 6" className={box} aria-hidden="true">
        <rect width="9" height="6" fill="#A51931" />
        <rect y="1" width="9" height="4" fill="#F4F5F8" />
        <rect y="2" width="9" height="2" fill="#2D2A4A" />
      </svg>
    )
  return (
    <svg viewBox="0 0 60 30" className={box} aria-hidden="true">
      <clipPath id={`${id}-s`}>
        <path d="M0,0 v30 h60 v-30 z" />
      </clipPath>
      <clipPath id={`${id}-t`}>
        <path d="M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z" />
      </clipPath>
      <g clipPath={`url(#${id}-s)`}>
        <path d="M0,0 v30 h60 v-30 z" fill="#012169" />
        <path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6" />
        <path
          d="M0,0 L60,30 M60,0 L0,30"
          clipPath={`url(#${id}-t)`}
          stroke="#C8102E"
          strokeWidth="4"
        />
        <path d="M30,0 v30 M0,15 h60" stroke="#fff" strokeWidth="10" />
        <path d="M30,0 v30 M0,15 h60" stroke="#C8102E" strokeWidth="6" />
      </g>
    </svg>
  )
}
