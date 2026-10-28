export type Role = 'owner' | 'admin' | 'mekanik' | 'staff'

export interface AuthUser {
  id: number
  name: string
  email: string
  role: Role
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface PaginationMeta {
  page: number
  limit: number
  total: number
}

export interface Paginated<T> {
  data: T[]
  meta: PaginationMeta
}

export interface SingleResponse<T> {
  data: T
  message?: string
}

export interface Product {
  id: number
  name: string
  sku: string
  category: string | null
  purchase_price: number
  selling_price: number
  stock: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface StockMovement {
  id: number
  product_id: number
  movement_type: 'in' | 'out' | 'adjustment'
  quantity: number
  stock_before: number
  stock_after: number
  notes: string | null
  created_at: string
}

export interface SaleItem {
  id: number
  sale_id: number
  product_id: number
  product_name: string
  quantity: number
  unit_price: number
  subtotal: number
}

export interface Sale {
  id: number
  user_id: number | null
  invoice_number: string
  subtotal: number
  discount: number
  total: number
  payment_method: string
  status: string
  notes: string | null
  items?: SaleItem[]
  created_at: string
  updated_at: string
}

export interface ServicePart {
  id: number
  service_id: number
  product_id: number
  product_name: string
  quantity: number
  unit_cost: number
  unit_price: number
  subtotal: number
  created_at: string
}

export interface ServicePayment {
  id: number
  service_id: number
  amount: number
  payment_method: string
  paid_at: string
  notes: string | null
  created_at: string
}

export type ServiceStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled'
export type PaymentStatus = 'unpaid' | 'paid'

export interface WorkshopService {
  id: number
  service_number: string
  customer_name: string
  customer_phone: string | null
  vehicle_plate: string
  vehicle_brand: string | null
  complaint: string
  diagnosis: string | null
  mechanic_name: string | null
  labor_cost: number
  parts_cost: number
  total_cost: number
  status: ServiceStatus
  payment_status: PaymentStatus
  notes: string | null
  parts?: ServicePart[]
  payments?: ServicePayment[]
  created_at: string
  updated_at: string
}

export interface PurchaseItem {
  id: number
  purchase_id: number
  product_id: number
  product_name: string
  quantity: number
  unit_cost: number
  subtotal: number
  created_at: string
}

export interface Purchase {
  id: number
  invoice_number: string
  supplier_name: string | null
  subtotal: number
  notes: string | null
  items?: PurchaseItem[]
  created_at: string
  updated_at: string
}

export interface DashboardSummary {
  products: {
    total: number
    low_stock: number
    out_of_stock: number
  }
  sales: {
    today_total: number
    today_count: number
    month_total: number
    month_count: number
    total_revenue: number
    total_count: number
  }
  services: {
    pending: number
    in_progress: number
    completed: number
    cancelled: number
    unpaid: number
    total: number
  }
  purchases: {
    today_total: number
    today_count: number
    month_total: number
    month_count: number
    total_count: number
  }
  low_stock_products: Array<{
    id: number
    name: string
    sku: string
    stock: number
  }>
  recent_sales: Array<{
    id: number
    invoice_number: string
    total: number
    created_at: string
  }>
  active_services: Array<{
    id: number
    service_number: string
    customer_name: string
    vehicle_plate: string
    status: ServiceStatus
    created_at: string
  }>
}
