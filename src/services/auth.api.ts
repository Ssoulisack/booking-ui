import { api, apiMessage } from "@/lib/api/client"
import { API_ENDPOINTS } from "@/lib/constants/api-endpoints"
import type {
  AcceptInput,
  AuthResponse,
  InvitationInfo,
  LoginInput,
  MyBranch,
  ProfileInput,
  RegisterInput,
  User,
} from "@/types/auth"
import type { SocialConfig } from "@/types/settings"

export const authService = {
  login: (body: LoginInput) =>
    api<AuthResponse>(API_ENDPOINTS.AUTH.LOGIN, { method: "POST", body }),
  register: (body: RegisterInput) =>
    api<AuthResponse>(API_ENDPOINTS.AUTH.REGISTER, { method: "POST", body }),
  socialConfig: () => api<SocialConfig>(API_ENDPOINTS.AUTH.SOCIAL_CONFIG),
  /** `token` is Google's ID token or Facebook's access token */
  socialLogin: (provider: "google" | "facebook", token: string) =>
    api<AuthResponse>(API_ENDPOINTS.AUTH.SOCIAL(provider), {
      method: "POST",
      body: { token },
    }),
  forgotPassword: (email: string) =>
    apiMessage(API_ENDPOINTS.AUTH.FORGOT_PASSWORD, {
      method: "POST",
      body: { email },
    }),
  resetPassword: (token: string, password: string) =>
    apiMessage(API_ENDPOINTS.AUTH.RESET_PASSWORD, {
      method: "POST",
      body: { token, password },
    }),
  me: () => api<User>(API_ENDPOINTS.AUTH.ME),
  updateMe: (body: ProfileInput) =>
    api<User>(API_ENDPOINTS.AUTH.ME, { method: "PUT", body }),
  /** choose a new password (the current one is checked): answers new tokens, older logins end */
  changePassword: (body: {
    current_password: string
    new_password: string
    email?: string
  }) =>
    api<AuthResponse>(API_ENDPOINTS.AUTH.CHANGE_PASSWORD, {
      method: "PUT",
      body,
    }),
  /** email a 6-digit code to the account's email */
  sendEmailCode: () =>
    apiMessage(API_ENDPOINTS.AUTH.EMAIL_CODE, { method: "POST" }),
  /** check the code: answers the person with the email marked verified */
  verifyEmail: (code: string) =>
    api<User>(API_ENDPOINTS.AUTH.EMAIL_VERIFY, {
      method: "POST",
      body: { code },
    }),
  myBranches: () => api<MyBranch[]>(API_ENDPOINTS.ME.BRANCHES),
  invitation: (token: string) =>
    api<InvitationInfo>(API_ENDPOINTS.INVITATION.ROOT(token)),
  acceptInvitation: (token: string, body: AcceptInput) =>
    api<AuthResponse>(API_ENDPOINTS.INVITATION.ACCEPT(token), {
      method: "POST",
      body,
    }),
}
