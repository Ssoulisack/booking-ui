import { apiPage } from "@/lib/api/client"
import { api, apiMessage } from "@/lib/api/client"
import { API_ENDPOINTS } from "@/lib/constants/api-endpoints"
import type {
  ClassSession,
  TimetableInput,
  TimetableResult,
  Timetable,
  TimetableStop,
} from "@/types/class"

export const classService = {
  /** Classes between two dates (YYYY-MM-DD, business time zone, both included) */
  sessions: async (branchId: number, from: string, to: string) =>
    (
      await apiPage<ClassSession>(
        API_ENDPOINTS.BRANCH.CLASS_SESSIONS(branchId),
        {
          query: { from, to, limit: 100 },
        },
      )
    ).items,
  timetables: (branchId: number) =>
    api<Timetable[]>(API_ENDPOINTS.BRANCH.CLASS_TIMETABLES(branchId)),
  saveClass: (
    branchId: number,
    c: { id?: number } & Omit<ClassSession, "id" | "seats_left">,
  ) =>
    c.id
      ? api<ClassSession>(API_ENDPOINTS.BRANCH.CLASS_SESSION(branchId, c.id), {
          method: "PUT",
          body: c,
        })
      : api<ClassSession>(API_ENDPOINTS.BRANCH.CLASS_SESSIONS(branchId), {
          method: "POST",
          body: c,
        }),
  deleteClass: (branchId: number, id: number) =>
    apiMessage(API_ENDPOINTS.BRANCH.CLASS_SESSION(branchId, id), {
      method: "DELETE",
    }),
  saveTimetable: (branchId: number, t: { id?: number } & TimetableInput) =>
    t.id
      ? api<TimetableResult>(
          API_ENDPOINTS.BRANCH.CLASS_TIMETABLE(branchId, t.id),
          {
            method: "PUT",
            body: t,
          },
        )
      : api<TimetableResult>(API_ENDPOINTS.BRANCH.CLASS_TIMETABLES(branchId), {
          method: "POST",
          body: t,
        }),
  stopTimetable: (branchId: number, id: number) =>
    api<TimetableStop>(API_ENDPOINTS.BRANCH.CLASS_TIMETABLE(branchId, id), {
      method: "DELETE",
    }),
}
