import type { SportType } from "@/lib/places"
export interface Sport {
  id: number
  name: string
  slug: string
  description: string
  image_url: string
  type: SportType
}

export interface ManagedSport {
  id: number
  name: string
  slug: string
  description: string
  image_key: string
  image_url: string
  active: boolean
  type: SportType
  /** restaurant areas: floor plan size in grid squares (0 at sport branches) */
  plan_width: number
  plan_height: number
  /** restaurant areas: 0 = ground floor, 1 = first floor, -1 = basement */
  floor: number
}
