import type { Province, SportType } from "@/lib/places"
import type { BranchType } from "@/types/auth"

export interface DirectoryBranch {
  type: BranchType
  name: string
  slug: string
  cover_url: string
  address: string
  province: Province | ""
  sports: Array<{ name: string; type: SportType }>
  /** lowest hourly court price; null when no court has a price yet */
  from_price: number | null
  currency: string
}
