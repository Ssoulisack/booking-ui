import type { TFunction } from "i18next"

import type { MediaItem } from "@/lib/api/types"

/** "Sport: Boxing", "Branch cover", "Company logo": where a picture is shown */
export const usedByLabel = (t: TFunction, use: MediaItem["used_by"][number]) =>
  t(`media.use.${use.kind}`, { name: use.name })

export function fileSize(bytes: number) {
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`
}
