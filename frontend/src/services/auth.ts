import { apiRequest } from './api'
import type { AuthUser } from '../types'

interface LoginResponse {
  message: string
  token: string
  user: AuthUser
}

interface RegisterResponse {
  message: string
  user: AuthUser
}

export async function login(
  email: string,
  password: string,
): Promise<LoginResponse> {
  const result = await apiRequest<LoginResponse>('/auth/login', {
    method: 'POST',
    body: { email, password },
  })

  localStorage.setItem('token', result.token)
  localStorage.setItem('user', JSON.stringify(result.user))

  return result
}

export async function register(
  name: string,
  email: string,
  password: string,
): Promise<RegisterResponse> {
  return apiRequest<RegisterResponse>('/auth/register', {
    method: 'POST',
    body: { name, email, password },
  })
}

export async function fetchMe(): Promise<AuthUser> {
  const result = await apiRequest<{ data: AuthUser }>('/auth/me')

  localStorage.setItem('user', JSON.stringify(result.data))

  return result.data
}

export function logout(): void {
  localStorage.removeItem('token')
  localStorage.removeItem('user')
}

export function getCurrentUser(): AuthUser | null {
  const user = localStorage.getItem('user')

  if (!user) return null

  try {
    return JSON.parse(user) as AuthUser
  } catch {
    localStorage.removeItem('user')
    return null
  }
}

export function isLoggedIn(): boolean {
  return Boolean(localStorage.getItem('token'))
}
