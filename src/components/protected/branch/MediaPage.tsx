import { MediaLibrary } from "@/components/protected/media"

import { API_ENDPOINTS } from "@/lib/constants/api-endpoints"
import { useBiz } from "@/hooks/use-branch"

/** /dashboard/:id/media — this branch's pictures only */
export function MediaPage() {
  const { id: branchId } = useBiz()
  return <MediaLibrary base={API_ENDPOINTS.BRANCH.ROOT(branchId)} />
}
