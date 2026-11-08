import { api } from "@/lib/api/client"
import { API_ENDPOINTS } from "@/lib/constants/api-endpoints"
import type { BranchSettings, SettingsInput } from "@/types/settings"

export const branchService = {
  getSettings: (branchId: number) =>
    api<BranchSettings>(API_ENDPOINTS.BRANCH.SETTINGS(branchId)),
  saveSettings: (branchId: number, body: SettingsInput) =>
    api<BranchSettings>(API_ENDPOINTS.BRANCH.SETTINGS(branchId), {
      method: "PUT",
      body,
    }),
  publish: (branchId: number) =>
    api<BranchSettings>(API_ENDPOINTS.BRANCH.PUBLISH(branchId), {
      method: "POST",
    }),
  unpublish: (branchId: number) =>
    api<BranchSettings>(API_ENDPOINTS.BRANCH.UNPUBLISH(branchId), {
      method: "POST",
    }),
}
