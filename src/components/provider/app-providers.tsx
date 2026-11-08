import { QueryClientProvider } from "@tanstack/react-query"
import type { ReactNode } from "react"

import { Toaster } from "@/components/ui/sonner"
import { queryClient } from "@/lib/query-client"

/** Everything the whole app needs above the router: server-state cache and the toast stack */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* below the 56 px top bar, so a message never covers the menu or account buttons */}
      <Toaster
        position="top-center"
        richColors
        offset={{ top: 64 }}
        mobileOffset={{ top: 64 }}
      />
    </QueryClientProvider>
  )
}
