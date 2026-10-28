import { apiRequest } from './api'
import type { DashboardSummary, SingleResponse } from '../types'

export function getDashboardSummary(): Promise<SingleResponse<DashboardSummary>> {
  return apiRequest<SingleResponse<DashboardSummary>>('/dashboard')
}
