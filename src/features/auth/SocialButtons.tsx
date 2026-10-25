import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router"

import { ErrorAlert } from "@/components/form"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"

import { useSocialConfig, useSocialLogin } from "./api"

// the little of each provider's browser script that is used here
interface GoogleId {
  initialize: (o: {
    client_id: string
    callback: (r: { credential: string }) => void
  }) => void
  renderButton: (el: HTMLElement, o: Record<string, unknown>) => void
}
interface FacebookSdk {
  init: (o: { appId: string; version: string; cookie?: boolean }) => void
  login: (
    cb: (r: { authResponse?: { accessToken: string } | null }) => void,
    o: { scope: string },
  ) => void
}
declare global {
  interface Window {
    google?: { accounts: { id: GoogleId } }
    FB?: FacebookSdk
    fbAsyncInit?: () => void
  }
}

/** Facebook's round blue "f" logo, like the coloured G on Google's button */
function FacebookLogo() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-5 shrink-0">
      <path
        fill="#1877F2"
        d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07c0 6.02 4.39 11.02 10.13 11.93v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.69.24 2.69.24v2.97h-1.52c-1.49 0-1.96.93-1.96 1.88v2.26h3.33l-.53 3.49h-2.8V24C19.61 23.09 24 18.09 24 12.07z"
      />
      <path
        fill="#fff"
        d="M16.67 15.56l.53-3.49h-3.33V9.81c0-.95.46-1.88 1.96-1.88h1.52V4.96s-1.38-.24-2.69-.24c-2.74 0-4.53 1.67-4.53 4.69v2.66H7.08v3.49h3.05V24a12.1 12.1 0 003.74 0v-8.44h2.8z"
      />
    </svg>
  )
}

const loaded = new Map<string, Promise<void>>()
/** Add a provider's script to the page once */
function loadScript(src: string): Promise<void> {
  let p = loaded.get(src)
  if (!p) {
    p = new Promise((resolve, reject) => {
      const el = document.createElement("script")
      el.src = src
      el.async = true
      el.onload = () => resolve()
      el.onerror = () => {
        loaded.delete(src)
        reject(new Error(src))
      }
      document.head.appendChild(el)
    })
    loaded.set(src, p)
  }
  return p
}

/**
 * "Continue with Google / Facebook" for the login and register pages: nothing at all until the
 * backend has the provider's ids. The browser gets a token from the provider and the backend
 * checks it; team members still use their password.
 */
export function SocialButtons({ next }: { next: string | null }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const config = useSocialConfig().data
  const social = useSocialLogin()
  const googleBox = useRef<HTMLDivElement>(null)
  const [facebookReady, setFacebookReady] = useState(false)
  const googleId = config?.google_client_id
  const facebookId = config?.facebook_app_id

  const done = () => navigate(next ?? "/", { replace: true })

  useEffect(() => {
    if (!googleId) return
    let live = true
    loadScript("https://accounts.google.com/gsi/client")
      .then(() => {
        const box = googleBox.current
        if (!live || !box || !window.google) return
        window.google.accounts.id.initialize({
          client_id: googleId,
          callback: ({ credential }) =>
            social.mutate(
              { provider: "google", token: credential },
              { onSuccess: done },
            ),
        })
        window.google.accounts.id.renderButton(box, {
          type: "standard",
          theme: "outline",
          size: "large",
          shape: "pill",
          text: "continue_with",
          width: Math.min(Math.max(box.clientWidth, 200), 400),
        })
      })
      .catch(() => {})
    return () => {
      live = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [googleId])

  useEffect(() => {
    if (!facebookId) return
    let live = true
    window.fbAsyncInit = () => {
      window.FB?.init({ appId: facebookId, version: "v19.0", cookie: false })
      if (live) setFacebookReady(true)
    }
    loadScript("https://connect.facebook.net/en_US/sdk.js").catch(() => {})
    return () => {
      live = false
    }
  }, [facebookId])

  if (!googleId && !facebookId) return null

  return (
    <div className="mt-6 space-y-3">
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        {t("social.or")}
        <span className="h-px flex-1 bg-border" />
      </div>
      <ErrorAlert error={social.error} />
      {googleId && (
        <div ref={googleBox} className="flex min-h-10 justify-center" />
      )}
      {facebookId && (
        <Button
          type="button"
          variant="outline"
          className="h-11 w-full rounded-full"
          disabled={!facebookReady || social.isPending}
          onClick={() =>
            // the popup must open straight from the click
            window.FB?.login(
              (r) => {
                const token = r.authResponse?.accessToken
                if (token)
                  social.mutate(
                    { provider: "facebook", token },
                    { onSuccess: done },
                  )
              },
              { scope: "public_profile,email" },
            )
          }
        >
          {social.isPending ? <Spinner /> : <FacebookLogo />}
          {t("social.facebook")}
        </Button>
      )}
      <p className="text-center text-xs text-muted-foreground">
        {t("social.customersOnly")}
      </p>
    </div>
  )
}
