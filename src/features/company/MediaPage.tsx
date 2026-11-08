import { API_ENDPOINTS } from "@/lib/constants/api-endpoints"
import { MediaLibrary } from "@/features/media"

/** /company/media — the company's own pictures (logo, cover), never a branch's */
export function CompanyMediaPage() {
  return <MediaLibrary base={API_ENDPOINTS.COMPANY.BASE} />
}
