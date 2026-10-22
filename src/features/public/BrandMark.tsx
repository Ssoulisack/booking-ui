/** The company logo, or the name's first letter on the brand colour */
export function BrandMark({
  name,
  logo,
  className = "size-9",
}: {
  name: string
  logo: string
  className?: string
}) {
  if (logo) {
    return (
      <img
        src={logo}
        alt=""
        className={`${className} shrink-0 rounded-lg bg-white object-cover`}
      />
    )
  }
  return (
    <span
      aria-hidden
      className={`${className} flex shrink-0 items-center justify-center rounded-lg bg-[var(--brand)] text-lg display-tight text-[var(--brand-foreground)]`}
    >
      {name.trim().charAt(0).toUpperCase()}
    </span>
  )
}
