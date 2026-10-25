import { ImagePlusIcon } from "lucide-react"
import { useRef } from "react"
import { useTranslation } from "react-i18next"

import { ErrorAlert } from "@/components/form"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import type { Media } from "@/lib/api/types"

import { useMedia, useUploadMedia } from "./api"

/** Pick a picture from the media library (this branch's, or the company's), or upload a new one into it */
export function MediaPicker({
  base,
  open,
  onOpenChange,
  onPick,
}: {
  base: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onPick: (media: Media) => void
}) {
  const { t } = useTranslation()
  const media = useMedia(base)
  const upload = useUploadMedia(base)
  const input = useRef<HTMLInputElement>(null)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("media.pickTitle")}</DialogTitle>
          <DialogDescription>{t("media.pickLead")}</DialogDescription>
        </DialogHeader>
        <div>
          <Button
            type="button"
            variant="outline"
            className="h-11 lg:h-9"
            disabled={upload.isPending}
            onClick={() => input.current?.click()}
          >
            {upload.isPending ? <Spinner /> : <ImagePlusIcon />}
            {t("media.upload")}
          </Button>
          <input
            ref={input}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            tabIndex={-1}
            onChange={(e) => {
              const file = e.target.files?.[0]
              // the new picture joins the library and is picked at once
              if (file) upload.mutate(file, { onSuccess: onPick })
              e.target.value = ""
            }}
          />
        </div>
        <ErrorAlert error={upload.error ?? media.error} />
        {media.isPending ? (
          <Skeleton className="h-40 rounded-lg" />
        ) : media.data && media.data.length === 0 ? (
          <p className="text-muted-foreground">{t("media.empty")}</p>
        ) : (
          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {media.data?.map((m) => (
              <li key={m.key}>
                <button
                  type="button"
                  className="block aspect-square w-full overflow-hidden rounded-lg border bg-muted/40 outline-offset-2 hover:ring-2 hover:ring-ring"
                  onClick={() => onPick({ key: m.key, url: m.url })}
                >
                  <img src={m.url} alt="" className="size-full object-cover" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  )
}
