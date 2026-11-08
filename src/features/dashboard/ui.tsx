import { API_ENDPOINTS } from "@/lib/constants/api-endpoints"
import { ImagePlusIcon, ImagesIcon, Trash2Icon, XIcon } from "lucide-react"
import { useEffect, useRef, useState, type ReactNode } from "react"
import { useTranslation } from "react-i18next"

import { ErrorAlert } from "@/components/global/form"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { Switch } from "@/components/ui/switch"
import { useUploadMedia } from "@/hooks/use-media"
import { MediaPicker } from "@/features/media/Picker"

import { useOutletContext } from "react-router"

import type { DashboardContext } from "./context"

export function PageHeader({
  title,
  lead,
  actions,
}: {
  title: string
  lead?: string
  actions?: ReactNode
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {lead && <p className="max-w-prose text-muted-foreground">{lead}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

/** A white block grouping one topic on a page */
export function Panel({
  title,
  lead,
  actions,
  children,
}: {
  title?: string
  lead?: string
  actions?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="rounded-xl bg-background p-4 ring-1 ring-border sm:p-5">
      {(title || actions) && (
        <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
          <div>
            {title && <h2 className="font-semibold">{title}</h2>}
            {lead && <p className="text-sm text-muted-foreground">{lead}</p>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </section>
  )
}

/** Nothing here yet: say so and offer the next step */
export function EmptyState({
  text,
  action,
}: {
  text: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-xl border border-dashed px-4 py-6">
      <p className="text-muted-foreground">{text}</p>
      {action}
    </div>
  )
}

/** A form in a dialog: the submit button shows a spinner and the API error appears inside */
export function FormDialog({
  open,
  onOpenChange,
  title,
  description,
  submitLabel,
  pending,
  error,
  onSubmit,
  submitDisabled = false,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  submitLabel: string
  pending: boolean
  error: unknown
  onSubmit: (e: React.FormEvent) => void
  /** the form is not complete yet: the submit button waits */
  submitDisabled?: boolean
  children: ReactNode
}) {
  const { t } = useTranslation()
  // the answer of a refused save shows beside the button that was pressed (a long form scrolls: an error at the top
  // would be out of sight) and comes into view
  const errorBox = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (error)
      errorBox.current?.scrollIntoView({ block: "nearest", behavior: "smooth" })
  }, [error])
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* the title above and the buttons below stay in view; only the middle (the fields) scrolls on a small screen */}
      <DialogContent className="flex max-h-[92dvh] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg">
        <form
          onSubmit={onSubmit}
          noValidate
          className="flex min-h-0 flex-1 flex-col"
        >
          <DialogHeader className="px-4 pt-4 pr-12 pb-3">
            <DialogTitle>{title}</DialogTitle>
            {description && (
              <DialogDescription>{description}</DialogDescription>
            )}
          </DialogHeader>

          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-1">
            {children}
          </div>
          <div ref={errorBox} className="px-4 empty:hidden">
            <ErrorAlert error={error} />
          </div>
          <DialogFooter className="m-0 rounded-none border-t bg-popover px-4 py-3">
            <Button
              type="button"
              variant="outline"
              className="h-11 lg:h-9"
              onClick={() => onOpenChange(false)}
            >
              {t("dash.cancel")}
            </Button>
            <Button
              type="submit"
              className="h-11 lg:h-9"
              disabled={pending || submitDisabled}
            >
              {pending && <Spinner />}
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

/** Delete with a confirm step; the API's reason (e.g. SPORT_HAS_RESOURCES) shows inside */
export function DeleteButton({
  what,
  onConfirm,
  pending,
  error,
  open,
  onOpenChange,
  label,
  title,
  description,
}: {
  what: string
  onConfirm: () => void
  pending: boolean
  error: unknown
  open?: boolean
  onOpenChange?: (open: boolean) => void
  /** a worded button (e.g. "Stop") instead of the bin icon; also the confirm button's text */
  label?: string
  title?: string
  description?: string
}) {
  const { t } = useTranslation()
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogTrigger asChild>
        {label ? (
          <Button variant="ghost" className="h-11 lg:h-9">
            {label}
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="icon-lg"
            className="size-11 text-muted-foreground lg:size-9"
            aria-label={t("dash.deleteWhat", { what })}
          >
            <Trash2Icon />
          </Button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {title ?? t("dash.deleteTitle", { what })}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {description ?? t("dash.deleteLead")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <ErrorAlert error={error} />
        <AlertDialogFooter>
          <AlertDialogCancel className="h-11 lg:h-9">
            {t("dash.cancel")}
          </AlertDialogCancel>
          <Button
            variant="destructive"
            className="h-11 lg:h-9"
            disabled={pending}
            onClick={onConfirm}
          >
            {pending && <Spinner />}
            {label ?? t("dash.delete")}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export function ActiveSwitch({
  id,
  checked,
  onChange,
  label,
  hint,
}: {
  id: string
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  hint?: string
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg border px-3 py-3">
      <div>
        <Label htmlFor={id}>{label}</Label>
        {hint && <p className="mt-1 text-sm text-muted-foreground">{hint}</p>}
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  )
}

/**
 * Pick an image (JPG, PNG or WebP, up to 2 MB): it uploads at once and the form keeps its key.
 * `value` is the stored key, `url` the current picture.
 */
export function ImageField({
  label,
  folder,
  url,
  onChange,
  wide,
  base: uploadTo,
}: {
  label: string
  folder: "sports" | "coaches" | "classes" | "branding"
  url: string
  onChange: (key: string, url: string) => void
  wide?: boolean
  /** where the file goes: "/company" for company pictures; default the branch in the URL */
  base?: string
}) {
  const { t } = useTranslation()
  const dashboard = useOutletContext<DashboardContext | undefined>()
  const base =
    uploadTo ??
    (dashboard ? API_ENDPOINTS.BRANCH.ROOT(dashboard.branch.branch_id) : "")
  const input = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState(url)
  const [picking, setPicking] = useState(false)
  const choose = (media: { key: string; url: string }) => {
    setPreview(media.url)
    onChange(media.key, media.url)
  }
  const upload = useUploadMedia(base, folder, { onSuccess: choose })

  return (
    <div className="min-w-0 space-y-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => input.current?.click()}
          className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dashed bg-muted/40 text-muted-foreground ${wide ? "h-24 w-40" : "size-24"}`}
          aria-label={t("dash.chooseImage")}
        >
          {upload.isPending ? (
            <Spinner />
          ) : preview ? (
            <img src={preview} alt="" className="size-full object-cover" />
          ) : (
            <ImagePlusIcon className="size-6" />
          )}
        </button>
        {/* min-w-0: lets the buttons wrap on a phone instead of widening the whole form */}
        <div className="min-w-0 space-y-2 text-sm">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-11 lg:h-9"
              onClick={() => input.current?.click()}
            >
              {preview ? t("dash.changeImage") : t("dash.chooseImage")}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-11 lg:h-9"
              onClick={() => setPicking(true)}
            >
              <ImagesIcon />
              {t("media.fromLibrary")}
            </Button>
            {preview && (
              <Button
                type="button"
                variant="ghost"
                className="h-11 lg:h-9"
                onClick={() => {
                  setPreview("")
                  onChange("", "")
                }}
              >
                <XIcon />
                {t("dash.removeImage")}
              </Button>
            )}
          </div>
          <p className="text-muted-foreground">{t("dash.imageHint")}</p>
        </div>
      </div>
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
      <ErrorAlert error={upload.error} />
      <MediaPicker
        base={base}
        open={picking}
        onOpenChange={setPicking}
        onPick={(media) => {
          choose(media)
          setPicking(false)
        }}
      />
    </div>
  )
}

/** "Are you sure?" before an action that is easy to do by mistake (money): nothing happens until Confirm */
export function ConfirmDialog({
  title,
  description,
  confirmLabel,
  pending,
  error,
  onConfirm,
  onClose,
}: {
  title: string
  description: string
  confirmLabel: string
  pending: boolean
  error?: unknown
  onConfirm: () => void
  onClose: () => void
}) {
  const { t } = useTranslation()
  return (
    <Dialog open onOpenChange={(o) => !o && !pending && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <ErrorAlert error={error} />
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            className="h-11 lg:h-9"
            disabled={pending}
            onClick={onClose}
          >
            {t("dash.cancel")}
          </Button>
          <Button
            type="button"
            className="h-11 lg:h-9"
            disabled={pending}
            onClick={onConfirm}
          >
            {pending && <Spinner />}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
