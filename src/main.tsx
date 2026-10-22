import "./i18n"
import "./index.css"

import { QueryClientProvider } from "@tanstack/react-query"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { RouterProvider } from "react-router"

import { Toaster } from "@/components/ui/sonner"
import { queryClient } from "@/lib/query-client"
import { router } from "@/routes/router"
import { useSession } from "@/stores/session"

// A different person (or nobody) is logged in: drop everything cached for the previous one
useSession.subscribe((state, prev) => {
  if (state.user?.id !== prev.user?.id) queryClient.clear()
})

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      {/* below the 56 px top bar, so a message never covers the menu or account buttons */}
      <Toaster
        position="top-center"
        richColors
        offset={{ top: 64 }}
        mobileOffset={{ top: 64 }}
      />
    </QueryClientProvider>
  </StrictMode>,
)
