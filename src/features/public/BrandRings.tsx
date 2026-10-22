import MagicRings from "@/components/reactbits/MagicRings"

import { ringColors } from "./brand"

/**
 * React Bits MagicRings behind the hero, in tints of the brand colour from company settings.
 * Phones and tablets: centred behind the whole hero, a little faded so the name stays readable.
 * Laptops: on the right, beside the text. A tap in the hero sends a ring outward.
 */
export function BrandRings({ brand }: { brand: string | undefined }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 opacity-75 lg:right-[-5%] lg:left-auto lg:w-[60%] lg:opacity-100"
    >
      <MagicRings
        {...ringColors(brand)}
        motion="pulse"
        ringCount={6}
        lineThickness={2}
        glow={1}
        parallax={0.03}
      />
    </div>
  )
}
