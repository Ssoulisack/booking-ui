import { ModeToggle } from "@/components/global/ModeToggle"

import { setPubMode, usePubMode } from "./theme"

const store = { use: usePubMode, set: setPubMode }

/** Sun / moon in the customer top bar */
export function ThemeToggle({ className }: { className?: string }) {
  return <ModeToggle store={store} className={className} />
}
