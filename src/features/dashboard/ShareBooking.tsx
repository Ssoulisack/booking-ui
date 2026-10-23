import {
  CopyIcon,
  DownloadIcon,
  ExternalLinkIcon,
  PrinterIcon,
  Share2Icon,
} from "lucide-react"
import QRCode from "qrcode"
import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"

/** The QR code holds the booking page's address: scanning it simply opens that page */
async function qrPng(url: string, size: number) {
  return QRCode.toDataURL(url, {
    width: size,
    margin: 2,
    errorCorrectionLevel: "M",
  })
}

/** ".../b/demo-sports-club" → "demo-sports-club-qr.png"; the home page ("/") → "home-qr.png" */
const fileName = (url: string) => {
  const last = new URL(url).pathname.split("/").filter(Boolean).pop()
  return `${last ?? "home"}-qr.png`
}

/**
 * Where share buttons send the link. Messenger has no web address for sharing without a
 * Facebook app id, so on phones it opens the Messenger app, elsewhere Share covers it.
 */
function shareTargets(url: string, text: string) {
  const u = encodeURIComponent(url)
  const msg = encodeURIComponent(`${text} ${url}`)
  return [
    { key: "whatsapp", href: `https://wa.me/?text=${msg}` },
    {
      key: "messenger",
      href: `fb-messenger://share/?link=${u}`,
      phoneOnly: true,
    },
    {
      key: "line",
      href: `https://social-plugins.line.me/lineit/share?url=${u}`,
    },
    {
      key: "facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${u}`,
    },
    {
      key: "telegram",
      href: `https://t.me/share/url?url=${u}&text=${encodeURIComponent(text)}`,
    },
  ]
}

const isPhone = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(pointer: coarse)").matches

/** A booking link (a branch page or the home): QR code, copy, share to chat apps, download, print a poster */
export function ShareBooking({ url, name }: { url: string; name: string }) {
  const { t } = useTranslation()
  const [qr, setQr] = useState("")
  const [copied, setCopied] = useState(false)
  const text = t("overview.share.text", { name })

  useEffect(() => {
    let live = true
    void qrPng(url, 1024).then((png) => live && setQr(png))
    return () => {
      live = false
    }
  }, [url])

  const qrFile = async () => {
    const blob = await (await fetch(qr)).blob()
    return new File([blob], fileName(url), { type: "image/png" })
  }

  // phones: the system share sheet (Messenger, WhatsApp, LINE…) with the QR picture and the link
  const shareNative = async () => {
    try {
      const file = await qrFile()
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text: `${text} ${url}` })
      } else {
        await navigator.share({ url, text })
      }
    } catch {
      // closed by the person, or not supported: nothing to do
    }
  }

  const print = () => {
    const root = document.documentElement
    root.dataset.print = "poster"
    const done = () => {
      delete root.dataset.print
      window.removeEventListener("afterprint", done)
    }
    window.addEventListener("afterprint", done)
    window.print()
  }

  const canShare = typeof navigator !== "undefined" && !!navigator.share

  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
      <div className="shrink-0 self-center rounded-xl bg-white p-2 ring-1 ring-border sm:self-start">
        {qr ? (
          <img
            src={qr}
            alt={t("overview.share.qrAlt", { name })}
            className="size-44"
          />
        ) : (
          <div className="size-44 animate-pulse rounded-lg bg-muted" />
        )}
      </div>

      <div className="min-w-0 flex-1 space-y-3">
        <p className="rounded-lg bg-muted px-3 py-2 font-medium break-all">
          {url}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            className="h-11 lg:h-9"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(url)
                setCopied(true)
              } catch {
                setCopied(false)
              }
            }}
          >
            <CopyIcon />
            {copied ? t("public.copied") : t("public.copyLink")}
          </Button>
          {canShare && (
            <Button
              variant="outline"
              className="h-11 lg:h-9"
              disabled={!qr}
              onClick={() => void shareNative()}
            >
              <Share2Icon />
              {t("overview.share.share")}
            </Button>
          )}
          <Button asChild variant="outline" className="h-11 lg:h-9">
            <a href={qr || undefined} download={fileName(url)}>
              <DownloadIcon />
              {t("overview.share.download")}
            </a>
          </Button>
          <Button
            variant="outline"
            className="h-11 lg:h-9"
            disabled={!qr}
            onClick={print}
          >
            <PrinterIcon />
            {t("overview.share.print")}
          </Button>
          <Button asChild variant="outline" className="h-11 lg:h-9">
            <a href={url} target="_blank" rel="noreferrer">
              <ExternalLinkIcon />
              {t("overview.openPage")}
            </a>
          </Button>
        </div>

        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            {t("overview.share.sendTo")}
          </p>
          <div className="flex flex-wrap gap-2">
            {shareTargets(url, text)
              .filter((s) => !s.phoneOnly || isPhone())
              .map((s) => (
                <Button
                  key={s.key}
                  asChild
                  variant="secondary"
                  className="h-11 lg:h-9"
                >
                  <a href={s.href} target="_blank" rel="noreferrer">
                    {t(`overview.share.apps.${s.key}`)}
                  </a>
                </Button>
              ))}
          </div>
        </div>
      </div>

      {qr && <Poster url={url} name={name} qr={qr} />}
    </div>
  )
}

/** Printed alone (A4/A5): name, QR code, "Scan to book" and the address */
function Poster({ url, name, qr }: { url: string; name: string; qr: string }) {
  const { t } = useTranslation()
  return createPortal(
    <div className="qr-poster hidden flex-col items-center justify-center gap-6 bg-white p-12 text-center text-black">
      <h1 className="display-tight text-5xl">{name}</h1>
      <img src={qr} alt="" className="size-[12cm]" />
      <p className="text-3xl font-semibold">{t("overview.share.scan")}</p>
      <p className="text-lg break-all">{url}</p>
    </div>,
    document.body,
  )
}
