import {
  CheckCircle2Icon,
  ImagePlusIcon,
  MessageCircleIcon,
  SendIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { useEffect, useRef, useState } from "react"
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
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { shrinkImage } from "@/lib/shrink-image"
import type { SlipWay } from "@/types/package"

import type { SlipInput } from "@/types/package"

/**
 * "I paid by transfer, here is the slip". The branch decides the ways: the picture is uploaded here (the team gets
 * it in their Telegram group: the customer is never told where it goes), and/or WhatsApp opens with the message
 * filled in. Both on: the customer chooses. Neither: a plain "I sent the slip" mark when the customer pays another
 * way (a phone call), when `markOnly` is set.
 */
export function SlipSender({
  telegram,
  whatsappNumber,
  message,
  sentAt,
  sentVia,
  pending,
  error,
  markOnly,
  onSend,
}: {
  /** the branch takes the slip as a picture uploaded here */
  telegram: boolean
  /** digits of the branch's WhatsApp number, "" when that way is off */
  whatsappNumber: string
  /** the text WhatsApp opens with (the booking code, the amount) */
  message: string
  /** when a slip was sent already */
  sentAt?: string | null
  sentVia?: SlipWay | ""
  pending: boolean
  error: unknown
  /** neither way is on: still let the customer tell the team a slip is coming */
  markOnly?: boolean
  onSend: (s: SlipInput) => Promise<unknown>
}) {
  const { t } = useTranslation()
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState("")
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState<unknown>(null)
  // the WhatsApp reminder is open
  const [asking, setAsking] = useState(false)
  const pick = useRef<HTMLInputElement>(null)
  const sent = !!sentAt

  useEffect(() => {
    if (!file) {
      setPreview("")
      return
    }
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const upload = async () => {
    if (!file) return
    setBusy(true)
    setFailed(null)
    try {
      await onSend({ via: "telegram", file: await shrinkImage(file) })
      setFile(null)
    } catch (e) {
      setFailed(e)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-3">
      {sent && (
        <p className="flex items-start gap-2 rounded-lg bg-emerald-50 p-3 text-sm font-medium text-emerald-900 ring-1 ring-emerald-200 dark:bg-emerald-400/15 dark:text-emerald-200">
          <CheckCircle2Icon className="mt-0.5 size-4 shrink-0" />
          {sentVia === "telegram" ? t("slip.sentPicture") : t("slip.sent")}
        </p>
      )}
      <ErrorAlert error={failed ?? error} />

      {telegram && (
        <div className="space-y-3">
          {!sent && (
            <p className="text-sm font-medium">{t("slip.uploadTitle")}</p>
          )}
          <input
            ref={pick}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            tabIndex={-1}
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null)
              e.target.value = ""
            }}
          />
          {preview && (
            <img
              src={preview}
              alt={t("slip.preview")}
              className="mx-auto max-h-72 rounded-lg bg-white object-contain p-1 ring-1 ring-border"
            />
          )}
          {file ? (
            <div className="grid gap-2 sm:grid-cols-2">
              <Button
                type="button"
                size="lg"
                className="h-12 text-base"
                disabled={busy || pending}
                onClick={upload}
              >
                {busy || pending ? <Spinner /> : <SendIcon />}
                {t("slip.send")}
              </Button>
              <Button
                type="button"
                size="lg"
                variant="outline"
                className="h-12 text-base"
                disabled={busy || pending}
                onClick={() => pick.current?.click()}
              >
                <ImagePlusIcon />
                {t("slip.chooseAnother")}
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              size="lg"
              variant={sent ? "outline" : "default"}
              className="h-12 w-full text-base"
              onClick={() => pick.current?.click()}
            >
              <ImagePlusIcon />
              {sent ? t("slip.sendAnother") : t("slip.choose")}
            </Button>
          )}
          {!sent && (
            <p className="text-center text-xs text-muted-foreground">
              {t("slip.uploadHint")}
            </p>
          )}
        </div>
      )}

      {telegram && whatsappNumber && !sent && (
        <p className="text-center text-sm text-muted-foreground">
          {t("slip.or")}
        </p>
      )}

      {whatsappNumber && (
        <Button
          type="button"
          size="lg"
          variant={sent || telegram ? "outline" : "default"}
          className="h-12 w-full text-base"
          onClick={() => setAsking(true)}
        >
          <MessageCircleIcon />
          {sent && sentVia === "whatsapp"
            ? t("slip.whatsappAgain")
            : t("slip.whatsapp")}
        </Button>
      )}

      {/* before WhatsApp opens: the photo of the slip must go into the chat, a message alone is refused */}
      <AlertDialog open={asking} onOpenChange={setAsking}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("slip.waTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("slip.waLead")}</AlertDialogDescription>
          </AlertDialogHeader>
          <p
            role="alert"
            className="flex items-start gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm font-medium text-destructive"
          >
            <TriangleAlertIcon className="mt-0.5 size-4 shrink-0" />
            {t("slip.waWarning")}
          </p>
          {telegram && !sent && (
            <p className="text-sm text-muted-foreground">
              {t("slip.waOrUpload")}
            </p>
          )}
          <AlertDialogFooter className="grid grid-cols-2 gap-2 sm:flex sm:justify-between">
            <AlertDialogCancel className="h-11 lg:h-9">
              {t("actions.back")}
            </AlertDialogCancel>
            <Button asChild className="h-11 lg:h-9">
              <a
                href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`}
                target="_blank"
                rel="noreferrer"
                onClick={() => {
                  setAsking(false)
                  // opening WhatsApp tells the team a slip is coming, once
                  if (!sent && !pending)
                    void onSend({ via: "whatsapp" }).catch(() => {})
                }}
              >
                <MessageCircleIcon />
                {t("slip.waOpen")}
              </a>
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {!telegram && !whatsappNumber && markOnly && !sent && (
        <Button
          type="button"
          size="lg"
          variant="outline"
          className="h-12 w-full text-base"
          disabled={pending}
          onClick={() => void onSend({ via: "whatsapp" }).catch(() => {})}
        >
          <SendIcon />
          {t("slip.mark")}
        </Button>
      )}
    </div>
  )
}
