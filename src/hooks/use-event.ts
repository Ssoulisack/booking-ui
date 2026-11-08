import { useQuery } from "@tanstack/react-query"

import { useBiz, useChange, useDelete } from "@/hooks/use-branch"
import { eventService } from "@/services/event.api"

export function useEvents() {
  const { id: branchId, key } = useBiz()
  return useQuery({
    queryKey: key("events"),
    queryFn: () => eventService.list(branchId),
  })
}

export function useEventPrices(eventId: number) {
  const { id: branchId, key } = useBiz()
  return useQuery({
    queryKey: key("events", "prices", eventId),
    queryFn: () => eventService.prices(branchId, eventId),
    refetchOnWindowFocus: false,
  })
}

export const useSaveEvent = (refresh = ["events"]) =>
  useChange(eventService.saveEvent, refresh)

export const useCopyEvent = (refresh = ["events"]) =>
  useChange(eventService.copyEvent, refresh)

export const useSaveEventPrices = (refresh = ["events"]) =>
  useChange(eventService.saveEventPrices, refresh)

export const useDeleteEvent = (onDone: () => void) =>
  useDelete(eventService.deleteEvent, onDone)
