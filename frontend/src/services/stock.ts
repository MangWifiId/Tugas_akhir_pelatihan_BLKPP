import { apiRequest, buildQuery } from './api'
import type {
  Paginated,
  SingleResponse,
  StockMovement,
} from '../types'

export interface MovementListParams {
  page?: number
  limit?: number
  product_id?: number
}

export interface CreateMovementPayload {
  product_id: number
  movement_type: 'in' | 'out' | 'adjustment'
  quantity: number
  adjustment_direction?: 'increase' | 'decrease'
  notes: string | null
}

export function listMovements(
  params: MovementListParams = {},
): Promise<Paginated<StockMovement>> {
  return apiRequest<Paginated<StockMovement>>(
    `/stock/movements${buildQuery({ ...params })}`,
  )
}

export function createMovement(
  payload: CreateMovementPayload,
): Promise<SingleResponse<StockMovement>> {
  return apiRequest<SingleResponse<StockMovement>>('/stock/movements', {
    method: 'POST',
    body: payload,
  })
}
