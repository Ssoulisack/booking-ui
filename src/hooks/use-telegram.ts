import { useQuery } from "@tanstack/react-query"

import { useBiz, useChange } from "@/hooks/use-branch"
import { telegramService } from "@/services/telegram.api"

export function useTelegram() {
  const { id: branchId, key } = useBiz()
  return useQuery({
    queryKey: key("telegram"),
    queryFn: () => telegramService.get(branchId),
    refetchOnWindowFocus: false,
  })
}

export const useSaveTelegram = (refresh = ["telegram"]) =>
  useChange(telegramService.saveTelegram, refresh)

export const useFindTelegramGroups = (refresh: string[] = []) =>
  useChange(telegramService.findTelegramGroups, refresh)

export const useTestTelegram = (refresh = ["telegram"]) =>
  useChange(telegramService.testTelegram, refresh)

export const useDisconnectTelegram = (refresh = ["telegram"]) =>
  useChange(telegramService.disconnectTelegram, refresh)
