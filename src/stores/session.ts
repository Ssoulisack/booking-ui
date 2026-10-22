import { create } from "zustand"
import { persist } from "zustand/middleware"

import type { AuthResponse, User } from "@/lib/api/types"

interface SessionState {
  accessToken: string | null
  refreshToken: string | null
  user: User | null
  // Why the last session ended (e.g. ACCOUNT_DISABLED), shown once on the login page
  endedReason: string | null
  // true once this tab logged out (by hand or forced): the login page then starts fresh, without "next"
  signedOut: boolean
  signIn: (auth: AuthResponse) => void
  setUser: (user: User) => void
  signOut: (reason?: string) => void
}

export const useSession = create<SessionState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      endedReason: null,
      signedOut: false,
      signIn: (auth) =>
        set({
          accessToken: auth.access_token,
          refreshToken: auth.refresh_token,
          user: auth.user,
          endedReason: null,
          signedOut: false,
        }),
      setUser: (user) => set({ user }),
      signOut: (reason) =>
        set({
          accessToken: null,
          refreshToken: null,
          user: null,
          endedReason: reason ?? null,
          signedOut: true,
        }),
    }),
    {
      name: "booking.session",
      partialize: ({ accessToken, refreshToken, user }) => ({
        accessToken,
        refreshToken,
        user,
      }),
    },
  ),
)

/** The company owner and admins: the company area and every branch */
export const runsCompany = (user: User | null) =>
  user?.company_role === "owner" || user?.company_role === "admin"
