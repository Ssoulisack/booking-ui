import { CheckIcon, CopyIcon } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"

/** A small icon button that copies a text (an account number, a name); a tick shows for two seconds */
export function CopyButton({
  text,
  label,
  doneLabel,
}: {
  text: string
  /** what the button says to a screen reader: "Copy account number" */
  label: string
  doneLabel: string
}) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // no clipboard (old browser, blocked): the text is on screen to copy by hand
    }
  }
  const Icon = copied ? CheckIcon : CopyIcon
  return (
    <Button
      type="button"
      variant="outline"
      size="icon-lg"
      className="size-11 shrink-0 lg:size-9"
      aria-label={copied ? doneLabel : label}
      title={copied ? doneLabel : label}
      onClick={copy}
    >
      <Icon />
    </Button>
  )
}
