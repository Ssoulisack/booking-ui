import { CheckIcon, CopyIcon } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"

/** Copies the booking code, for a chat or a note; says so for two seconds */
export function CopyCode({
  code,
  compact,
}: {
  code: string
  /** an icon only (inside the booking details) */
  compact?: boolean
}) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // no clipboard (old browser, blocked): the code is on screen to copy by hand
    }
  }
  const Icon = copied ? CheckIcon : CopyIcon
  return compact ? (
    <Button
      type="button"
      variant="ghost"
      size="icon-lg"
      className="-my-2 size-11"
      aria-label={copied ? t("public.find.copied") : t("public.find.copyCode")}
      onClick={copy}
    >
      <Icon />
    </Button>
  ) : (
    <Button type="button" variant="outline" className="h-11" onClick={copy}>
      <Icon />
      {copied ? t("public.find.copied") : t("public.find.copyCode")}
    </Button>
  )
}
