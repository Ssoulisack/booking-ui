/** The company logo; nothing at all when none was uploaded */
export function BrandMark({
  logo,
  className = "size-9",
}: {
  // kept so every place that shows the mark passes the company name
  name?: string
  logo: string
  className?: string
}) {
  if (!logo) return null
  return (
    <img
      src={logo}
      alt=""
      className={`${className} shrink-0 rounded-lg object-cover`}
    />
  )
}
