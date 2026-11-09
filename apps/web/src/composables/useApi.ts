const BASE_URL = import.meta.env.VITE_API_URL || ''

let authToken = ''

export function setAuthToken(token: string) {
  authToken = token
  if (token) localStorage.setItem('nimink_token', token)
  else localStorage.removeItem('nimink_token')
}

export function getAuthToken(): string {
  if (!authToken) {
    try { authToken = localStorage.getItem('nimink_token') || '' } catch {}
  }
  return authToken
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  const token = getAuthToken()
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error', code: 'UNKNOWN' }))
    throw { status: res.status, ...err }
  }

  return res.json()
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body),
  delete: <T>(path: string) => request<T>('DELETE', path),
  upload: async <T>(path: string, file: File): Promise<T> => {
    const headers: Record<string, string> = {}
    const token = getAuthToken()
    if (token) headers['Authorization'] = `Bearer ${token}`
    const form = new FormData()
    form.append('image', file)
    const res = await fetch(`${BASE_URL}${path}`, { method: 'POST', headers, body: form })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Unknown error', code: 'UNKNOWN' }))
      throw { status: res.status, ...err }
    }
    return res.json()
  },
}
