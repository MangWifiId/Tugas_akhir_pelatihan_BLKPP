import { apiRequest, buildQuery } from './api'
import type {
  Paginated,
  PaymentStatus,
  ServicePart,
  ServicePayment,
  ServiceStatus,
  SingleResponse,
  WorkshopService,
} from '../types'

export interface ServiceListParams {
  page?: number
  limit?: number
  search?: string
  status?: ServiceStatus | ''
}

export interface CreateServicePayload {
  customer_name: string
  customer_phone: string | null
  vehicle_plate: string
  vehicle_brand: string | null
  complaint: string
  mechanic_name: string | null
  notes: string | null
}

export interface UpdateServicePayload {
  diagnosis: string | null
  mechanic_name: string | null
  labor_cost: number
  status: ServiceStatus
  payment_status: PaymentStatus
  notes: string | null
}

export interface AddServicePartPayload {
  product_id: number
  quantity: number
}

export function listServices(
  params: ServiceListParams = {},
): Promise<Paginated<WorkshopService>> {
  return apiRequest<Paginated<WorkshopService>>(
    `/services${buildQuery({ ...params })}`,
  )
}

export function getService(
  id: number,
): Promise<SingleResponse<WorkshopService>> {
  return apiRequest<SingleResponse<WorkshopService>>(`/services/${id}`)
}

export function createService(
  payload: CreateServicePayload,
): Promise<SingleResponse<WorkshopService>> {
  return apiRequest<SingleResponse<WorkshopService>>('/services', {
    method: 'POST',
    body: payload,
  })
}

export function updateService(
  id: number,
  payload: UpdateServicePayload,
): Promise<SingleResponse<WorkshopService>> {
  return apiRequest<SingleResponse<WorkshopService>>(`/services/${id}`, {
    method: 'PUT',
    body: payload,
  })
}

export function addServicePart(
  id: number,
  payload: AddServicePartPayload,
): Promise<SingleResponse<ServicePart>> {
  return apiRequest<SingleResponse<ServicePart>>(`/services/${id}/parts`, {
    method: 'POST',
    body: payload,
  })
}

export function createServicePayment(
  id: number,
  notes: string | null,
): Promise<SingleResponse<ServicePayment>> {
  return apiRequest<SingleResponse<ServicePayment>>(
    `/services/${id}/payments`,
    {
      method: 'POST',
      body: { notes },
    },
  )
}
