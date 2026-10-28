import { apiRequest, buildQuery } from './api'
import type { Paginated, Product, SingleResponse } from '../types'

export interface ProductListParams {
  page?: number
  limit?: number
  search?: string
}

export interface CreateProductPayload {
  name: string
  sku: string
  category: string | null
  purchase_price: number
  selling_price: number
}

export interface UpdateProductPayload {
  name: string
  sku: string
  category: string | null
  selling_price: number
  is_active?: boolean
}

export function listProducts(
  params: ProductListParams = {},
): Promise<Paginated<Product>> {
  return apiRequest<Paginated<Product>>(
    `/products${buildQuery({ ...params })}`,
  )
}

export function createProduct(
  payload: CreateProductPayload,
): Promise<SingleResponse<Product>> {
  return apiRequest<SingleResponse<Product>>('/products', {
    method: 'POST',
    body: payload,
  })
}

export function updateProduct(
  id: number,
  payload: UpdateProductPayload,
): Promise<SingleResponse<Product>> {
  return apiRequest<SingleResponse<Product>>(`/products/${id}`, {
    method: 'PUT',
    body: payload,
  })
}

export function deleteProduct(id: number): Promise<{ message: string }> {
  return apiRequest<{ message: string }>(`/products/${id}`, {
    method: 'DELETE',
  })
}
