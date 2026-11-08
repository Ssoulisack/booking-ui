import "./i18n"
import "./index.css"

import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { RouterProvider } from "react-router"

import { AppProviders } from "@/components/provider/app-providers"
import { queryClient } from "@/lib/query-client"
import { router } from "@/routes/router"
import { useSession } from "@/stores/session"

// A different person (or nobody) is logged in: drop everything cached for the previous one
useSession.subscribe((state, prev) => {
  if (state.user?.id !== prev.user?.id) queryClient.clear()
})

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  </StrictMode>,
)
