import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { authService } from "@/services/auth.api"
import { useSession } from "@/stores/session"
import type { AcceptInput, AuthResponse, MyBranch, User } from "@/types/auth"

export const authKeys = {
  me: ["me"] as const,
  branches: ["me", "branches"] as const,
  invitation: (token: string) => ["invitation", token] as const,
}

/** The logged-in user, re-read from the server so a disabled account is noticed */
export function useMe() {
  const token = useSession((s) => s.accessToken)
  return useQuery({
    queryKey: authKeys.me,
    queryFn: async () => {
      const user = await authService.me()
      useSession.getState().setUser(user)
      return user
    },
    enabled: !!token,
  })
}

/**
 * Businesses the user belongs to. Always re-checked when a dashboard screen opens, so a
 * member who was disabled or removed is noticed on the next click.
 */
export function useMyBranches() {
  const token = useSession((s) => s.accessToken)
  return useQuery({
    queryKey: authKeys.branches,
    queryFn: authService.myBranches,
    enabled: !!token,
    refetchOnMount: "always",
  })
}

/** Branches where the dashboard can be used now (a closed one only by the owner and admins) */
export const usableBranches = (list: MyBranch[] | undefined) =>
  (list ?? []).filter(
    (b) =>
      b.active &&
      (b.status !== "closed" || b.role === "owner" || b.role === "admin"),
  )

export function useLogin() {
  return useMutation({
    mutationFn: authService.login,
    onSuccess: (auth) => useSession.getState().signIn(auth),
  })
}

/** Which of Google / Facebook this install offers (none until the backend has their ids) */
export function useSocialConfig() {
  return useQuery({
    queryKey: ["auth", "social"],
    queryFn: authService.socialConfig,
    staleTime: Infinity,
    retry: false,
  })
}

export function useSocialLogin() {
  return useMutation({
    mutationFn: ({
      provider,
      token,
    }: {
      provider: "google" | "facebook"
      token: string
    }) => authService.socialLogin(provider, token),
    onSuccess: (auth) => useSession.getState().signIn(auth),
  })
}

export function useRegister() {
  return useMutation({
    mutationFn: authService.register,
    onSuccess: (auth) => useSession.getState().signIn(auth),
  })
}

export function useForgotPassword() {
  return useMutation({ mutationFn: authService.forgotPassword })
}

/** `onSuccess` gets the server's message code; the screen decides what to show and where to go */
export function useResetPassword(
  token: string,
  options?: { onSuccess?: (message: string) => void },
) {
  return useMutation({
    mutationFn: (password: string) =>
      authService.resetPassword(token, password),
    onSuccess: (message) => options?.onSuccess?.(message),
  })
}

/** The invitation behind the link in the invite email */
export function useInvitation(token: string) {
  return useQuery({
    queryKey: authKeys.invitation(token),
    queryFn: () => authService.invitation(token),
    retry: false,
  })
}

/** Accepting signs the person in, then reads their memberships so the screen can pick where to land */
export function useAcceptInvitation(
  token: string,
  options?: { onSuccess?: (auth: AuthResponse, list: MyBranch[]) => void },
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: AcceptInput) =>
      authService.acceptInvitation(token, body),
    onSuccess: async (auth) => {
      useSession.getState().signIn(auth)
      const list = await queryClient.fetchQuery({
        queryKey: authKeys.branches,
        queryFn: authService.myBranches,
      })
      options?.onSuccess?.(auth, list)
    },
  })
}

export function useUpdateProfile(options?: {
  onSuccess?: (user: User) => void
}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: authService.updateMe,
    onSuccess: (updated) => {
      useSession.getState().setUser(updated)
      queryClient.setQueryData(authKeys.me, updated)
      options?.onSuccess?.(updated)
    },
  })
}
