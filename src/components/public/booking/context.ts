import { useOutletContext } from "react-router"

import type { PublicBranch } from "@/types/public"

export interface PublicContext {
  slug: string
  business: PublicBranch
}

/** The business of the public page in the URL (/b/:slug) */
export function usePublic() {
  return useOutletContext<PublicContext>()
}
