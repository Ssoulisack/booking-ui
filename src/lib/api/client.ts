import { useSession } from "@/stores/session"

import type { AuthResponse, Envelope, Page } from "./types"

export const API_URL = (
  import.meta.env.VITE_API_URL ?? "http://localhost:3000/api/v1"
).replace(/\/+$/, "")

// Codes that mean this login can no longer be used: the session is ended and the user sent to login
const SESSION_ENDING = new Set([
  "ACCOUNT_DISABLED",
  "TOKEN_REVOKED",
  "UNAUTHORIZED",
  "INVALID_ACCESS_TOKEN",
  "INVALID_REFRESH_TOKEN",
  "REFRESH_TOKEN_EXPIRED",
  "REFRESH_TOKEN_INVALID_SIGNATURE",
  "REFRESH_TOKEN_INVALID_ALGORITHM",
])

/** An API failure; `code` is the backend's message code (e.g. SLOT_NOT_AVAILABLE) */
export class ApiError extends Error {
  readonly status: number
  readonly code: string

  constructor(status: number, code: string) {
    super(code)
    this.name = "ApiError"
    this.status = status
    this.code = code
  }
}

export interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"
  body?: unknown
  // a file upload (multipart); used instead of body
  form?: FormData
  query?: Record<string, string | number | boolean | undefined | null>
  signal?: AbortSignal
}

function buildUrl(path: string, query?: RequestOptions["query"]) {
  const url = new URL(API_URL + path)
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value))
    }
  }
  return url.toString()
}

async function send(
  path: string,
  opts: RequestOptions,
  token: string | null,
): Promise<{ status: number; envelope: Envelope<unknown> }> {
  const headers: Record<string, string> = { Accept: "application/json" }
  if (opts.body !== undefined && !opts.form) {
    headers["Content-Type"] = "application/json"
  }
  if (token) headers.Authorization = `Bearer ${token}`

  let res: Response
  try {
    res = await fetch(buildUrl(path, opts.query), {
      method: opts.method ?? "GET",
      headers,
      body:
        opts.form ??
        (opts.body === undefined ? undefined : JSON.stringify(opts.body)),
      signal: opts.signal,
    })
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err
    throw new ApiError(0, "NETWORK_ERROR")
  }

  let envelope: Envelope<unknown>
  try {
    envelope = (await res.json()) as Envelope<unknown>
  } catch {
    envelope = { success: res.ok }
  }
  return { status: res.status, envelope }
}

// One refresh at a time: requests that fail together wait for the same refresh
let refreshing: Promise<boolean> | null = null

// true: new tokens saved; false: refresh refused and the session ended.
// A network failure throws NETWORK_ERROR and keeps the session for a later try.
function refreshSession(): Promise<boolean> {
  refreshing ??= (async () => {
    const { refreshToken, signIn, signOut } = useSession.getState()
    if (!refreshToken) {
      signOut("SESSION_EXPIRED")
      return false
    }
    const { status, envelope } = await send(
      "/auth/refresh",
      { method: "POST" },
      refreshToken,
    )
    if (status === 200 && envelope.success && envelope.data) {
      signIn(envelope.data as AuthResponse)
      return true
    }
    signOut(envelope.message || "SESSION_EXPIRED")
    return false
  })().finally(() => {
    refreshing = null
  })
  return refreshing
}

/** Sends a request and returns the whole envelope; throws ApiError when success is false */
export async function request<T>(
  path: string,
  opts: RequestOptions = {},
): Promise<Envelope<T>> {
  const token = useSession.getState().accessToken
  let { status, envelope } = await send(path, opts, token)

  if (status === 401 && token) {
    if (!(await refreshSession())) {
      throw new ApiError(
        401,
        useSession.getState().endedReason ?? "SESSION_EXPIRED",
      )
    }
    ;({ status, envelope } = await send(
      path,
      opts,
      useSession.getState().accessToken,
    ))
  }

  if (!envelope.success || status >= 400) {
    const code = envelope.message || `HTTP_${status}`
    // only a sent token can be "ended"; a failed login without one just shows the error
    if (
      token &&
      useSession.getState().accessToken &&
      SESSION_ENDING.has(code)
    ) {
      useSession.getState().signOut(code)
    }
    throw new ApiError(status, code)
  }
  return envelope as Envelope<T>
}

/** Returns `data` of a successful response */
export async function api<T>(path: string, opts?: RequestOptions): Promise<T> {
  return (await request<T>(path, opts)).data as T
}

/** Returns a paginated list (`data` + `meta`) */
export async function apiPage<T>(
  path: string,
  opts?: RequestOptions,
): Promise<Page<T>> {
  const env = await request<T[]>(path, opts)
  return {
    items: env.data ?? [],
    meta: env.meta ?? { total: 0, page: 1, limit: 0, total_page: 0 },
  }
}

/** Returns `message` of a successful response (e.g. PASSWORD_UPDATED) */
export async function apiMessage(
  path: string,
  opts?: RequestOptions,
): Promise<string> {
  return (await request<unknown>(path, opts)).message ?? ""
}

/**
 * Downloads a file answer (e.g. ?format=csv) with the login token and saves it in the browser.
 * Errors come back as the usual envelope and are thrown as ApiError.
 */
export async function download(
  path: string,
  opts: RequestOptions,
  filename: string,
) {
  const get = (token: string | null) =>
    fetch(buildUrl(path, opts.query), {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    }).catch(() => {
      throw new ApiError(0, "NETWORK_ERROR")
    })

  let res = await get(useSession.getState().accessToken)
  if (res.status === 401 && (await refreshSession())) {
    res = await get(useSession.getState().accessToken)
  }
  if (!res.ok) {
    const env = (await res.json().catch(() => ({}))) as Envelope<unknown>
    throw new ApiError(res.status, env.message || `HTTP_${res.status}`)
  }
  const url = URL.createObjectURL(await res.blob())
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
