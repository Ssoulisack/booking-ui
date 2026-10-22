import type { PageMeta } from "@/lib/api/types"

/** Rows per page for lists the API sends whole (team, branches, report rows) */
export const PAGE_SIZE = 20

/**
 * One page of a list that arrived whole, with the same meta the paged API endpoints send, so
 * <Pager> works for both. A page past the end (e.g. after a filter) shows the last page.
 */
export function paginate<T>(items: T[], page: number, size = PAGE_SIZE) {
  const total_page = Math.max(1, Math.ceil(items.length / size))
  const current = Math.min(Math.max(1, page), total_page)
  const meta: PageMeta = {
    total: items.length,
    page: current,
    limit: size,
    total_page,
  }
  return {
    items: items.slice((current - 1) * size, current * size),
    page: current,
    meta,
  }
}
