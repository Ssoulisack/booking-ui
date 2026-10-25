import { MediaLibrary } from "@/features/media"

import { useBiz } from "./api"

/** /dashboard/:id/media — this branch's pictures only */
export function MediaPage() {
  const { base } = useBiz()
  return <MediaLibrary base={base} />
}
