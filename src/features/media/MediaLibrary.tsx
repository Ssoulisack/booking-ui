import { ImagePlusIcon } from "lucide-react"
import { useRef } from "react"
import { useTranslation } from "react-i18next"

import { ErrorAlert } from "@/components/form"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { DeleteButton, EmptyState, PageHeader } from "@/features/dashboard/ui"

import { useDeleteMedia, useMedia, useUploadMedia } from "./api"
import { fileSize, usedByLabel } from "./use-label"

/** Every picture of one scope: upload new ones, see where each is used, delete the ones nothing uses */
export function MediaLibrary({ base }: { base: string }) {
  const { t } = useTranslation()
  const media = useMedia(base)
  const upload = useUploadMedia(base)
  const remove = useDeleteMedia(base)
  const input = useRef<HTMLInputElement>(null)

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title={t("nav.media")}
        lead={t("media.lead")}
        actions={
          <Button
            className="h-11 lg:h-9"
            disabled={upload.isPending}
            onClick={() => input.current?.click()}
          >
            {upload.isPending ? <Spinner /> : <ImagePlusIcon />}
            {t("media.upload")}
          </Button>
        }
      />
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) upload.mutate(file)
          e.target.value = ""
        }}
      />
      <p className="-mt-3 text-sm text-muted-foreground">{t("dash.imageHint")}</p>
      <ErrorAlert error={upload.error ?? media.error} />
      {media.isPending ? (
        <Skeleton className="h-64 rounded-xl" />
      ) : media.data && media.data.length === 0 ? (
        <EmptyState text={t("media.empty")} />
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {media.data?.map((m) => (
            <li
              key={m.key}
              className="overflow-hidden rounded-xl bg-background ring-1 ring-border"
            >
              <img
                src={m.url}
                alt=""
                className="aspect-square w-full object-cover"
                loading="lazy"
              />
              <div className="space-y-2 p-3">
                <div className="flex flex-wrap gap-1">
                  {m.used_by.length === 0 ? (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      {t("media.unused")}
                    </span>
                  ) : (
                    m.used_by.map((u, i) => (
                      <span
                        key={i}
                        className="rounded-full bg-muted px-2 py-0.5 text-xs"
                      >
                        {usedByLabel(t, u)}
                      </span>
                    ))
                  )}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-muted-foreground">
                    {fileSize(m.size_bytes)}
                  </span>
                  {m.used_by.length === 0 ? (
                    <DeleteButton
                      what={t("media.thisPicture")}
                      title={t("media.deleteTitle")}
                      description={t("media.deleteLead")}
                      pending={remove.isPending}
                      error={remove.error}
                      onConfirm={() => remove.mutate(m.key)}
                    />
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      {t("media.inUse")}
                    </span>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
