import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query"

import { authKeys } from "@/features/auth/api"
import { ApiError } from "@/lib/api/client"

// Answers that mean the user's access to a business changed: re-read the membership list
const ACCESS_CHANGED = new Set([
  "MEMBERSHIP_DISABLED",
  "BRANCH_CLOSED",
  "BRANCH_NOT_FOUND",
])

function onApiError(err: unknown) {
  if (err instanceof ApiError && ACCESS_CHANGED.has(err.code)) {
    void queryClient.invalidateQueries({ queryKey: authKeys.branches })
  }
}

export const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: onApiError }),
  mutationCache: new MutationCache({ onError: onApiError }),
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      // a 4xx answer will not change by asking again; network and 5xx errors get 2 more tries
      retry: (count, err) =>
        !(err instanceof ApiError && err.status >= 400 && err.status < 500) &&
        count < 2,
    },
  },
})
