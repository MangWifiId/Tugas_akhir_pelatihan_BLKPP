const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api'

export class ApiError extends Error {
  status: number
  retryAfter: number | null

  constructor(message: string, status: number, retryAfter: number | null = null) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.retryAfter = retryAfter
  }
}

export function getToken(): string | null {
  return localStorage.getItem('token')
}

export function clearSession(): void {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
}

function notifyUnauthorized(): void {
  clearSession()
  window.dispatchEvent(new Event('auth:unauthorized'))
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestOptions = {},
): Promise<T> {
  const token = getToken()
  const headers = new Headers(options.headers)
  headers.set('Content-Type', 'application/json')

  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  let response: Response

  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
      body:
        options.body === undefined ? undefined : JSON.stringify(options.body),
    })
  } catch {
    throw new ApiError(
      'Tidak dapat terhubung ke server. Pastikan backend berjalan.',
      0,
    )
  }

  const data = (await response.json().catch(() => ({}))) as {
    error?: string
  }

  if (!response.ok) {
    if (response.status === 401 && !endpoint.startsWith('/auth/login')) {
      notifyUnauthorized()
    }

    const retryAfterHeader = response.headers.get('Retry-After')
    const retryAfter = retryAfterHeader ? Number(retryAfterHeader) : null

    throw new ApiError(
      data.error ?? 'Terjadi kesalahan pada server',
      response.status,
      Number.isFinite(retryAfter) ? retryAfter : null,
    )
  }

  return data as T
}

export type QueryValue = string | number | boolean | undefined | null

export function buildQuery(params: Record<string, QueryValue>): string {
  const search = new URLSearchParams()

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue
    search.set(key, String(value))
  }

  const query = search.toString()

  return query ? `?${query}` : ''
}

export { API_BASE_URL }
