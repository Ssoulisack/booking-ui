import { useState } from "react"

import { cn } from "@/lib/utils"

/**
 * A coach's round picture: their photo, or, without one, the grey person silhouette people know from Facebook (never
 * a broken image: a photo that fails to load falls back to it too)
 */
export function CoachAvatar({
  src,
  className,
}: {
  src?: string | null
  /** the size, e.g. "size-10" */
  className?: string
}) {
  const [broken, setBroken] = useState(false)
  const box = cn(
    "shrink-0 overflow-hidden rounded-full",
    className ?? "size-10",
  )
  if (src && !broken)
    return (
      <img
        src={src}
        alt=""
        loading="lazy"
        className={cn(box, "object-cover")}
        onError={() => setBroken(true)}
      />
    )
  return <Silhouette className={box} />
}

function Silhouette({ className }: { className: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      aria-hidden
      className={cn(className, "bg-[#c9ccd1] dark:bg-[#4e5563]")}
    >
      {/* head and shoulders, white like the default profile picture */}
      <circle
        cx="20"
        cy="15.5"
        r="7.5"
        className="fill-white dark:fill-[#b0b3b8]"
      />
      <path
        d="M5 40c1.5-8.5 7.8-13 15-13s13.5 4.5 15 13z"
        className="fill-white dark:fill-[#b0b3b8]"
      />
    </svg>
  )
}
