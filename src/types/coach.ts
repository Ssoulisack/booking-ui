export interface ManagedCoach {
  id: number
  name: string
  bio: string
  phone: string
  image_key: string
  image_url: string
  active: boolean
  sports: Array<{ id: number; name: string }>
}
