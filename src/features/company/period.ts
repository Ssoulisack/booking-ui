import { todayIn } from "@/lib/format"

/** First day of this month to today, in the company's time zone */
export function thisMonth(timezone: string) {
  const today = todayIn(timezone)
  return { from: `${today.slice(0, 8)}01`, to: today }
}
