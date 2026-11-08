import { MapIcon, MapPinIcon, PhoneIcon } from "lucide-react"
import { useTranslation } from "react-i18next"

import type { PublicBranch } from "@/types/public"
import { webUrl } from "@/lib/url"

import { usePublic } from "./context"

/** The social links a branch gave, and whether it gave anything at all (then there is no Contact section or menu item) */
export function branchContact(business: PublicBranch) {
  const links = Object.entries(business.social_links ?? {}).filter(([, url]) =>
    webUrl(url),
  )
  const has =
    !!business.phone ||
    !!business.address ||
    !!business.map_url ||
    links.length > 0
  return { has, links }
}

export function useBranchContact() {
  return branchContact(usePublic().business)
}

/** The branch's address, phone, map and social links, at the bottom of its page (the menu's Contact goes here) */
export function ContactSection() {
  const { t } = useTranslation()
  const { business } = usePublic()
  const { has, links } = useBranchContact()
  if (!has) return null
  const tel = business.phone.replace(/[^\d+]/g, "")
  const map = webUrl(business.map_url)
  const area = business.province ? t(`provinces.${business.province}`) : ""
  const row =
    "inline-flex min-h-11 items-center gap-2 underline-offset-4 hover:underline"
  return (
    <section id="contact" className="scroll-mt-20 space-y-4">
      <h2 className="display-tight text-3xl">
        <span className="candy-label [--candy:var(--candy-sky)]">
          {t("home.contactTitle")}
        </span>
      </h2>
      <div className="space-y-1 text-sm">
        {(business.address || area) && (
          <p className="flex items-start gap-2">
            <MapPinIcon className="mt-0.5 size-4 shrink-0" />
            <span>{[business.address, area].filter(Boolean).join(", ")}</span>
          </p>
        )}
        <div className="flex flex-wrap gap-x-5">
          {tel && (
            <a href={`tel:${tel}`} className={row}>
              <PhoneIcon className="size-4" />
              {business.phone}
            </a>
          )}
          {map && (
            <a href={map} target="_blank" rel="noreferrer" className={row}>
              <MapIcon className="size-4" />
              {t("public.map")}
            </a>
          )}
        </div>
      </div>
      {links.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {links.map(([name, url]) => (
            <a
              key={name}
              href={webUrl(url)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-11 items-center rounded-full border border-border px-5 text-sm font-medium capitalize"
            >
              {name}
            </a>
          ))}
        </div>
      )}
    </section>
  )
}
