import { create } from "zustand"
import { persist } from "zustand/middleware"

// The branch picked in the dashboard switcher, remembered for the next visit
interface BranchState {
  currentId: number | null
  setCurrentId: (id: number | null) => void
}

export const useCurrentBranch = create<BranchState>()(
  persist(
    (set) => ({
      currentId: null,
      setCurrentId: (currentId) => set({ currentId }),
    }),
    { name: "booking.branch" },
  ),
)
