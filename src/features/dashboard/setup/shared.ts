import { useQueryClient } from "@tanstack/react-query"

import { useBiz } from "../api"

/** Refresh these parts of the business's data (plus plan usage and the public page) */
export function useInvalidate(parts: string[]) {
  const { key } = useBiz()
  const queryClient = useQueryClient()
  return () => {
    for (const part of [...parts, "usage"]) {
      void queryClient.invalidateQueries({ queryKey: key(part) })
    }
    void queryClient.invalidateQueries({ queryKey: ["public"] })
  }
}

/** Weekdays in the order people read a week (Monday first); the API counts 0 = Sunday */
export const WEEK = [1, 2, 3, 4, 5, 6, 0] as const

/** "8" / "" from a number input → number or null */
export const numberOrNull = (v: string) => (v.trim() === "" ? null : Number(v))
