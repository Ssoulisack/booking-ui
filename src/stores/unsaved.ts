import { useEffect, useId } from "react"
import { create } from "zustand"

/**
 * "changes": a form with edits not saved yet. "booking": a time the customer picked but has not
 * booked. See UnsavedGuard.
 */
export type UnsavedKind = "changes" | "booking"

interface UnsavedState {
  entries: Array<{ id: string; kind: UnsavedKind }>
  set: (id: string, kind: UnsavedKind, dirty: boolean) => void
  /** drop every entry of a kind at once, before an on-purpose navigation (the Book button) */
  release: (kind: UnsavedKind) => void
}

export const useUnsavedStore = create<UnsavedState>()((set) => ({
  entries: [],
  set: (id, kind, dirty) =>
    set((s) => {
      const has = s.entries.some((e) => e.id === id)
      if (dirty === has) return s
      return {
        entries: dirty
          ? [...s.entries, { id, kind }]
          : s.entries.filter((e) => e.id !== id),
      }
    }),
  release: (kind) =>
    set((s) => ({ entries: s.entries.filter((e) => e.kind !== kind) })),
}))

/** Call in every form with a Save button: `dirty` true while it holds changes that are not saved */
export function useUnsaved(dirty: boolean, kind: UnsavedKind = "changes") {
  const id = useId()
  const set = useUnsavedStore((s) => s.set)
  useEffect(() => {
    set(id, kind, dirty)
    return () => set(id, kind, false)
  }, [id, kind, dirty, set])
}

/** The customer pressed Book: going on to the booking page is not leaving it unfinished */
export const releaseBooking = () =>
  useUnsavedStore.getState().release("booking")
