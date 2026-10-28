import type { Role } from '../types'

const currencyFormatter = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
})

const numberFormatter = new Intl.NumberFormat('id-ID')

export function formatCurrency(value: number | null | undefined): string {
  return currencyFormatter.format(value ?? 0)
}

export function formatNumber(value: number | null | undefined): string {
  return numberFormatter.format(value ?? 0)
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '-'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return '-'

  return date.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '-'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return '-'

  return date.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export const roleLabels: Record<Role, string> = {
  owner: 'Owner',
  admin: 'Admin',
  mekanik: 'Mekanik',
  staff: 'Staff',
}

export const serviceStatusLabels: Record<string, string> = {
  pending: 'Menunggu',
  in_progress: 'Dikerjakan',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
}

export const paymentStatusLabels: Record<string, string> = {
  unpaid: 'Belum dibayar',
  paid: 'Lunas',
}

export const movementTypeLabels: Record<string, string> = {
  in: 'Stok masuk',
  out: 'Stok keluar',
  adjustment: 'Koreksi',
}

export function statusTone(value: string): string {
  switch (value) {
    case 'completed':
    case 'paid':
    case 'in':
      return 'success'
    case 'in_progress':
    case 'adjustment':
      return 'info'
    case 'pending':
    case 'unpaid':
      return 'warning'
    case 'cancelled':
    case 'out':
      return 'danger'
    default:
      return 'neutral'
  }
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2)

  if (parts.length === 0) return '?'

  return parts.map((part) => part.charAt(0).toUpperCase()).join('')
}
