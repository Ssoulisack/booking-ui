import { useMutation, useQuery } from "@tanstack/react-query"

import { api, apiMessage } from "@/lib/api/client"
import type {
  AuthResponse,
  InvitationInfo,
  MyBranch,
  SocialConfig,
  User,
} from "@/lib/api/types"
import { useSession } from "@/stores/session"

export const authKeys = {
  me: ["me"] as const,
  branches: ["me", "branches"] as const,
  invitation: (token: string) => ["invitation", token] as const,
}

export interface LoginInput {
  login: string // email or phone number
  password: string
}

export interface RegisterInput {
  name: string
  password: string
  nationality: string
  phone?: string
  email?: string
}

export interface ProfileInput {
  name: string
  nationality: string
  phone: string
  email: string
}

export interface AcceptInput {
  name?: string
  password?: string
  phone?: string
}

export const authApi = {
  login: (body: LoginInput) =>
    api<AuthResponse>("/auth/login", { method: "POST", body }),
  register: (body: RegisterInput) =>
    api<AuthResponse>("/auth/register", { method: "POST", body }),
  socialConfig: () => api<SocialConfig>("/auth/social/config"),
  /** `token` is Google's ID token or Facebook's access token */
  socialLogin: (provider: "google" | "facebook", token: string) =>
    api<AuthResponse>(`/auth/social/${provider}`, {
      method: "POST",
      body: { token },
    }),
  forgotPassword: (email: string) =>
    apiMessage("/auth/forgot-password", { method: "POST", body: { email } }),
  resetPassword: (token: string, password: string) =>
    apiMessage("/auth/reset-password", {
      method: "POST",
      body: { token, password },
    }),
  me: () => api<User>("/auth/me"),
  updateMe: (body: ProfileInput) =>
    api<User>("/auth/me", { method: "PUT", body }),
  myBranches: () => api<MyBranch[]>("/me/branches"),
  invitation: (token: string) =>
    api<InvitationInfo>(`/invitations/${encodeURIComponent(token)}`),
  acceptInvitation: (token: string, body: AcceptInput) =>
    api<AuthResponse>(`/invitations/${encodeURIComponent(token)}/accept`, {
      method: "POST",
      body,
    }),
}

/** The logged-in user, re-read from the server so a disabled account is noticed */
export function useMe() {
  const token = useSession((s) => s.accessToken)
  return useQuery({
    queryKey: authKeys.me,
    queryFn: async () => {
      const user = await authApi.me()
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
    queryFn: authApi.myBranches,
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
    mutationFn: authApi.login,
    onSuccess: (auth) => useSession.getState().signIn(auth),
  })
}

/** Which of Google / Facebook this install offers (none until the backend has their ids) */
export function useSocialConfig() {
  return useQuery({
    queryKey: ["auth", "social"],
    queryFn: authApi.socialConfig,
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
    }) => authApi.socialLogin(provider, token),
    onSuccess: (auth) => useSession.getState().signIn(auth),
  })
}

export function useRegister() {
  return useMutation({
    mutationFn: authApi.register,
    onSuccess: (auth) => useSession.getState().signIn(auth),
  })
}
