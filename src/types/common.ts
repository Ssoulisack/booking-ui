export interface Envelope<T> {
  success: boolean
  message?: string
  data?: T
  meta?: PageMeta
}

export interface PageMeta {
  total: number
  page: number
  limit: number
  total_page: number
}

export interface Page<T> {
  items: T[]
  meta: PageMeta
}
