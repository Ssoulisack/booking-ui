import { useRef } from "react"

import { Input } from "@/components/ui/input"
import { groupDigits } from "@/lib/format"

/**
 * A whole-number amount (a price): shown as 1.000.000 while typing, but `value` and `onChange` stay plain digits
 * ("1000000"), so the page reads it with Number() as before. Anything that is not a digit is dropped. The cursor
 * stays after the same digit when the dots move.
 */
export function MoneyInput({
  value,
  onChange,
  onKeyDown,
  ...props
}: Omit<React.ComponentProps<typeof Input>, "value" | "onChange" | "type"> & {
  value: string
  onChange: (digits: string) => void
}) {
  const ref = useRef<HTMLInputElement>(null)
  const shown = groupDigits(value.replace(/\D/g, ""))

  // after React has put the dots back (also when a refused key left the value as it was), the cursor goes after the
  // same digit it was after
  const keepCursor = (digitsBefore: number) =>
    requestAnimationFrame(() => {
      const el = ref.current
      if (!el || document.activeElement !== el) return
      let seen = 0
      let pos = 0
      while (pos < el.value.length && seen < digitsBefore) {
        if (/\d/.test(el.value[pos])) seen++
        pos++
      }
      el.setSelectionRange(pos, pos)
    })

  return (
    <Input
      {...props}
      ref={ref}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      value={shown}
      onKeyDown={(e) => {
        // Backspace just after a dot (or Delete just before one) removes the digit next to it, not only the dot
        const el = e.currentTarget
        const at = el.selectionStart ?? 0
        if (at === el.selectionEnd) {
          if (e.key === "Backspace" && el.value[at - 1] === ".")
            el.setSelectionRange(at - 1, at - 1)
          if (e.key === "Delete" && el.value[at] === ".")
            el.setSelectionRange(at + 1, at + 1)
        }
        onKeyDown?.(e)
      }}
      onChange={(e) => {
        const raw = e.target.value
        const at = e.target.selectionStart ?? raw.length
        keepCursor(raw.slice(0, at).replace(/\D/g, "").length)
        // no leading zeros ("007" → "7"), but a single 0 stays
        onChange(raw.replace(/\D/g, "").replace(/^0+(?=\d)/, ""))
      }}
    />
  )
}
