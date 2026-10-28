import { apiRequest, buildQuery } from './api'
import type { Paginated, Purchase, SingleResponse } from '../types'

export interface PurchaseListParams {
  page?: number
  limit?: number
}

export interface CreatePurchasePayload {
  invoice_number: string
  supplier_name: string | null
  notes: string | null
  items: Array<{
    product_id: number
    quantity: number
    unit_cost: number
  }>
}

export function listPurchases(
  params: PurchaseListParams = {},
): Promise<Paginated<Purchase>> {
  return apiRequest<Paginated<Purchase>>(
    `/purchases${buildQuery({ ...params })}`,
  )
}

export function getPurchase(id: number): Promise<SingleResponse<Purchase>> {
  return apiRequest<SingleResponse<Purchase>>(`/purchases/${id}`)
}

export function createPurchase(
  payload: CreatePurchasePayload,
): Promise<SingleResponse<Purchase>> {
  return apiRequest<SingleResponse<Purchase>>('/purchases', {
    method: 'POST',
    body: payload,
  })
}
