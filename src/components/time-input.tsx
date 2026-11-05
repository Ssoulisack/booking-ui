import { useEffect, useState } from "react"

import { cn } from "@/lib/utils"

const pad = (n: number) => String(n).padStart(2, "0")

/**
 * Reads what someone typed as a 24-hour time: "1930", "19:30", "19 30" and "9:5" all work. Returns "HH:MM", or null
 * when it is not a time (hour 00–23, minute 00–59; hour 24 only as "24:00" when `midnightEnd`).
 */
export function parseTime(raw: string, midnightEnd = false): string | null {
  const text = raw.trim()
  const m =
    /^(\d{1,2})[:.\s]?(\d{1,2})$/.exec(text) ?? /^(\d{2})(\d{2})$/.exec(text)
  if (!m) return null
  const h = Number(m[1])
  const min = Number(m[2])
  if (min > 59) return null
  if (h === 24) return midnightEnd && min === 0 ? "24:00" : null
  if (h > 23) return null
  return `${pad(h)}:${pad(min)}`
}

/** While typing: keep digits and one colon, and put the colon in after the hour ("19" + "3" → "19:3") */
function typing(raw: string) {
  const digits = raw.replace(/\D/g, "").slice(0, 4)
  return digits.length > 2
    ? `${digits.slice(0, 2)}:${digits.slice(2)}`
    : digits.length === 2 && raw.endsWith(":")
      ? `${digits}:`
      : digits
}

/**
 * A time of day in 24-hour form "HH:MM", the same on every computer (the browser's own time field shows AM/PM on
 * some). Type it (it is checked: hour 00–23, minute 00–59). "" is "no
 * time". With `midnightEnd`, 24:00 is allowed for a closing or end time at midnight.
 */
export function TimeInput({
  value,
  onChange,
  id,
  label,
  midnightEnd = false,
  clearable = false,
  disabled,
  className,
}: {
  value: string
  onChange: (v: string) => void
  id?: string
  /** read by screen readers: "Opens", "Ends at"… */
  label: string
  midnightEnd?: boolean
  /** an emptied field means "no time" (for fields that may stay empty) */
  clearable?: boolean
  disabled?: boolean
  className?: string
}) {
  const [text, setText] = useState(value)
  const [bad, setBad] = useState(false)
  // the saved value changed from outside (another row, a reset): show it
  useEffect(() => {
    setText(value)
    setBad(false)
  }, [value])

  const change = (raw: string) => {
    const next = raw.includes(":") && raw.length === 5 ? raw : typing(raw)
    setText(next)
    const ok = parseTime(next, midnightEnd)
    if (ok && next.length === 5) {
      setBad(false)
      if (ok !== value) onChange(ok)
    } else if (next === "" && clearable) {
      setBad(false)
      if (value !== "") onChange("")
    } else {
      setBad(next !== "") // half typed is not wrong yet; wrong is "25:70" or when leaving the field
    }
  }
  const leave = () => {
    const ok = parseTime(text, midnightEnd)
    if (ok) {
      setText(ok)
      setBad(false)
      if (ok !== value) onChange(ok)
    } else if (text === "" && clearable) {
      setBad(false)
    } else {
      setText(value) // not a time: back to the last good one
      setBad(false)
    }
  }

  return (
    <>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder="HH:MM"
        maxLength={5}
        aria-label={label}
        aria-invalid={bad}
        title={bad ? "00:00 – 23:59" : undefined}
        value={text}
        disabled={disabled}
        onChange={(e) => change(e.target.value)}
        onBlur={leave}
        className={cn(
          "h-11 w-24 rounded-md border bg-background px-3 text-center text-base tabular-nums outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-50 lg:h-9 lg:text-sm",
          bad && "border-destructive focus-visible:ring-destructive/30",
          className,
        )}
      />
    </>
  )
}
