import type { ReactNode } from "react"

import ClickSpark from "@/components/reactbits/ClickSpark"

// React Bits' "Sparkle" preset (src/demo/Animations/presets/ClickSpark.js): golden twinkling stars
const SPARKLE = {
  shape: "star",
  sparkColor: ["#fde68a", "#fbbf24", "#ffffff"],
  sparkCount: 6,
  sparkSize: 16,
  sparkRadius: 36,
  duration: 800,
  randomness: 0.6,
} as const

/** Stars wherever someone taps or clicks on a public page (React Bits ClickSpark, Sparkle preset) */
export function PageSpark({ children }: { children: ReactNode }) {
  return (
    <ClickSpark
      {...SPARKLE}
      sparkColor={[...SPARKLE.sparkColor]}
      className="min-h-dvh"
    >
      {children}
    </ClickSpark>
  )
}
