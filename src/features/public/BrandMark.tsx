import defaultLogo from "@/assets/default-logo.png"

/** The company logo, or the project's default logo (transparent, no background) when none was uploaded */
export function BrandMark({
  logo,
  className = "size-9",
}: {
  // kept so every place that shows the mark passes the company name
  name?: string
  logo: string
  className?: string
}) {
  if (logo) {
    return (
      <img
        src={logo}
        alt=""
        className={`${className} shrink-0 rounded-lg object-cover`}
      />
    )
  }
  return (
    <img
      src={defaultLogo}
      alt=""
      className={`${className} shrink-0 object-contain`}
    />
  )
}
