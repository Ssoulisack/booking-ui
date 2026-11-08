export interface Media {
  key: string
  url: string
}

/** A file in the media library; used_by lists what shows it (empty: safe to delete) */
export interface MediaItem extends Media {
  size_bytes: number
  created_at: string
  used_by: Array<{
    kind: "sport" | "coach" | "cover" | "logo" | "pay_qr" | "event"
    name: string
  }>
}
