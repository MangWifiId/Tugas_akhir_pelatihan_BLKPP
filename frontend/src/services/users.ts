import { apiRequest, buildQuery } from './api'
import type { AuthUser, Paginated, Role, SingleResponse } from '../types'

export interface UserListParams {
  page?: number
  limit?: number
}

export interface CreateUserPayload {
  name: string
  email: string
  password: string
  role: Role
}

export function listUsers(
  params: UserListParams = {},
): Promise<Paginated<AuthUser>> {
  return apiRequest<Paginated<AuthUser>>(`/users${buildQuery({ ...params })}`)
}

export function createUser(
  payload: CreateUserPayload,
): Promise<SingleResponse<AuthUser>> {
  return apiRequest<SingleResponse<AuthUser>>('/users', {
    method: 'POST',
    body: payload,
  })
}

export function updateUserRole(
  id: number,
  role: Role,
): Promise<SingleResponse<AuthUser>> {
  return apiRequest<SingleResponse<AuthUser>>(`/users/${id}/role`, {
    method: 'PUT',
    body: { role },
  })
}
