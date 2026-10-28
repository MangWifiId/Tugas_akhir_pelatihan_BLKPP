import { apiRequest, buildQuery } from './api'
import type { Paginated, Sale, SingleResponse } from '../types'

export interface SaleListParams {
  page?: number
  limit?: number
}

export interface CreateSalePayload {
  items: Array<{
    product_id: number
    quantity: number
  }>
  notes: string | null
}

export function listSales(params: SaleListParams = {}): Promise<Paginated<Sale>> {
  return apiRequest<Paginated<Sale>>(`/sales${buildQuery({ ...params })}`)
}

export function getSale(id: number): Promise<SingleResponse<Sale>> {
  return apiRequest<SingleResponse<Sale>>(`/sales/${id}`)
}

export function createSale(
  payload: CreateSalePayload,
): Promise<SingleResponse<Sale>> {
  return apiRequest<SingleResponse<Sale>>('/sales', {
    method: 'POST',
    body: payload,
  })
}
