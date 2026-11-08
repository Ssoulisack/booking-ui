import { api, apiMessage } from "@/lib/api/client"
import { API_ENDPOINTS } from "@/lib/constants/api-endpoints"
import type {
  TelegramGroups,
  TelegramInput,
  TelegramSettings,
} from "@/types/telegram"

export const telegramService = {
  get: (branchId: number) =>
    api<TelegramSettings>(API_ENDPOINTS.BRANCH.TELEGRAM(branchId)),
  saveTelegram: (branchId: number, body: TelegramInput) =>
    api<TelegramSettings>(API_ENDPOINTS.BRANCH.TELEGRAM(branchId), {
      method: "PUT",
      body,
    }),
  findTelegramGroups: (branchId: number, _: void) =>
    api<TelegramGroups>(API_ENDPOINTS.BRANCH.TELEGRAM_FIND_GROUPS(branchId), {
      method: "POST",
    }),
  testTelegram: (branchId: number, _: void) =>
    api<TelegramSettings>(API_ENDPOINTS.BRANCH.TELEGRAM_TEST(branchId), {
      method: "POST",
    }),
  disconnectTelegram: (branchId: number, _: void) =>
    apiMessage(API_ENDPOINTS.BRANCH.TELEGRAM(branchId), { method: "DELETE" }),
}
