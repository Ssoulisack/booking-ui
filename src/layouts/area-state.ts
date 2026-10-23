import { useEffect, useState } from "react"

/** The owner's and admins' two workspaces: the whole company, or one branch's dashboard */
export type Area = "company" | "branch"

// the area shown last, kept across the layout swap so the new one can animate in
let shown: Area | undefined

/** The area this shell came from, when it differs (read once per mount) */
export function usePreviousArea(area: Area | undefined) {
  const [previous] = useState(() =>
    shown !== undefined && shown !== area ? shown : undefined,
  )
  useEffect(() => {
    shown = area
  }, [area])
  return previous
}
