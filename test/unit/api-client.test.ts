import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { api, ApiError, apiPage } from "@/lib/api/client"
import type { AuthResponse, User } from "@/lib/api/types"
import { useSession } from "@/stores/session"

const user: User = {
  id: 7,
  email: "staff@club.la",
  avatar: "",
  name: "Noy",
  username: "",
  phone: "",
  company_role: "",
  status: true,
  nationality: "LA",
  email_generated: false,
  member_no: "CNO000001",
  created_at: "",
  updated_at: "",
}

const auth = (access: string, refresh: string): AuthResponse => ({
  access_token: access,
  refresh_token: refresh,
  user,
})

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  })

type Handler = (url: string, init: RequestInit) => Response | Promise<Response>

function mockFetch(handler: Handler) {
  const fn = vi.fn((input: RequestInfo | URL, init?: RequestInit) =>
    Promise.resolve(handler(String(input), init ?? {})),
  )
  vi.stubGlobal("fetch", fn)
  return fn
}

const bearer = (init: RequestInit) =>
  (init.headers as Record<string, string>).Authorization

beforeEach(() => {
  useSession.setState({
    accessToken: null,
    refreshToken: null,
    user: null,
    endedReason: null,
    signedOut: false,
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("api client", () => {
  it("returns data from the success envelope and sends the token", async () => {
    useSession.getState().signIn(auth("A1", "R1"))
    const fetch = mockFetch(() => json(200, { success: true, data: { id: 1 } }))

    await expect(
      api("/sports", { query: { page: 2, keyword: "" } }),
    ).resolves.toEqual({ id: 1 })
    const [url, init] = fetch.mock.calls[0]
    expect(url).toBe("http://api.test/api/v1/sports?page=2")
    expect(bearer(init!)).toBe("Bearer A1")
  })

  it("returns items and meta for a paginated list", async () => {
    const meta = { total: 1, page: 1, limit: 20, total_page: 1 }
    mockFetch(() => json(200, { success: true, data: [{ id: 1 }], meta }))

    await expect(apiPage("/bookings")).resolves.toEqual({
      items: [{ id: 1 }],
      meta,
    })
  })

  it("throws ApiError carrying the backend code", async () => {
    mockFetch(() =>
      json(409, { success: false, message: "SLOT_NOT_AVAILABLE" }),
    )

    const err = await api("/public/club/bookings", {
      method: "POST",
      body: {},
    }).catch((e) => e)
    expect(err).toBeInstanceOf(ApiError)
    expect(err).toMatchObject({ status: 409, code: "SLOT_NOT_AVAILABLE" })
  })

  it("reports NETWORK_ERROR when the server cannot be reached", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.reject(new TypeError("Failed to fetch"))),
    )

    await expect(api("/auth/me")).rejects.toMatchObject({
      status: 0,
      code: "NETWORK_ERROR",
    })
  })

  it("a failed login without a token does not touch the session", async () => {
    mockFetch(() =>
      json(401, { success: false, message: "INVALID_CREDENTIALS" }),
    )

    await expect(
      api("/auth/login", { method: "POST", body: {} }),
    ).rejects.toMatchObject({
      code: "INVALID_CREDENTIALS",
    })
    expect(useSession.getState().endedReason).toBeNull()
  })

  it("refreshes an expired token once and retries the request", async () => {
    useSession.getState().signIn(auth("OLD", "R1"))
    const fetch = mockFetch((url, init) => {
      if (url.endsWith("/auth/refresh")) {
        expect(bearer(init)).toBe("Bearer R1")
        return json(200, { success: true, data: auth("NEW", "R2") })
      }
      return bearer(init) === "Bearer NEW"
        ? json(200, { success: true, data: "ok" })
        : json(401, { success: false, message: "INVALID_ACCESS_TOKEN" })
    })

    await expect(api("/auth/me")).resolves.toBe("ok")
    expect(fetch).toHaveBeenCalledTimes(3)
    expect(useSession.getState()).toMatchObject({
      accessToken: "NEW",
      refreshToken: "R2",
    })
  })

  it("shares one refresh between requests that fail together", async () => {
    useSession.getState().signIn(auth("OLD", "R1"))
    let refreshes = 0
    mockFetch(async (url, init) => {
      if (url.endsWith("/auth/refresh")) {
        refreshes++
        await new Promise((r) => setTimeout(r, 10))
        return json(200, { success: true, data: auth("NEW", "R2") })
      }
      return bearer(init) === "Bearer NEW"
        ? json(200, { success: true, data: url })
        : json(401, { success: false, message: "INVALID_ACCESS_TOKEN" })
    })

    await Promise.all([api("/a"), api("/b"), api("/c")])
    expect(refreshes).toBe(1)
  })

  it("ends the session when the refresh is refused", async () => {
    useSession.getState().signIn(auth("OLD", "R1"))
    mockFetch((url) =>
      url.endsWith("/auth/refresh")
        ? json(401, { success: false, message: "TOKEN_REVOKED" })
        : json(401, { success: false, message: "INVALID_ACCESS_TOKEN" }),
    )

    await expect(api("/auth/me")).rejects.toMatchObject({
      status: 401,
      code: "TOKEN_REVOKED",
    })
    expect(useSession.getState()).toMatchObject({
      accessToken: null,
      user: null,
      endedReason: "TOKEN_REVOKED",
    })
  })

  it("ends the session when the account is disabled", async () => {
    useSession.getState().signIn(auth("A1", "R1"))
    mockFetch(() => json(403, { success: false, message: "ACCOUNT_DISABLED" }))

    await expect(api("/auth/me")).rejects.toMatchObject({
      code: "ACCOUNT_DISABLED",
    })
    expect(useSession.getState()).toMatchObject({
      accessToken: null,
      endedReason: "ACCOUNT_DISABLED",
    })
  })

  it("keeps the session for a business-level refusal", async () => {
    useSession.getState().signIn(auth("A1", "R1"))
    mockFetch(() =>
      json(403, { success: false, message: "MEMBERSHIP_DISABLED" }),
    )

    await expect(api("/manage/businesses/1/bookings")).rejects.toMatchObject({
      code: "MEMBERSHIP_DISABLED",
    })
    expect(useSession.getState().accessToken).toBe("A1")
  })
})
