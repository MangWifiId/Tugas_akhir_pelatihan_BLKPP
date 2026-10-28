import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import PageHeader from '../components/PageHeader'
import StatusBadge from '../components/StatusBadge'
import { useAuth } from '../context/AuthContext'
import { getDashboardSummary } from '../services/dashboard'
import type { DashboardSummary } from '../types'
import {
  formatCurrency,
  formatDateTime,
  formatNumber,
  serviceStatusLabels,
} from '../utils/format'

export default function DashboardPage() {
  const { user } = useAuth()
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true

    async function load() {
      try {
        const result = await getDashboardSummary()

        if (active) {
          setSummary(result.data)
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error ? err.message : 'Gagal memuat dashboard',
          )
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    void load()

    return () => {
      active = false
    }
  }, [])

  const activeServiceCount = summary
    ? summary.services.pending + summary.services.in_progress
    : 0

  return (
    <section>
      <PageHeader
        title={`Halo, ${user?.name.split(' ')[0] ?? 'Pengguna'}`}
        description="Ringkasan operasional bengkel hari ini."
        actions={
          <>
            <Link className="button button-ghost" to="/services">
              Servis Bengkel
            </Link>
            <Link className="button button-primary" to="/sales">
              + Transaksi Baru
            </Link>
          </>
        }
      />

      {error && <div className="alert alert-error">{error}</div>}

      {loading && <div className="panel loading-row">Memuat ringkasan…</div>}

      {summary && (
        <>
          <div className="stat-grid">
            <article className="stat-card">
              <span className="stat-icon stat-icon-blue">↗</span>
              <div>
                <p>Penjualan hari ini</p>
                <strong>{formatCurrency(summary.sales.today_total)}</strong>
                <small>{summary.sales.today_count} transaksi</small>
              </div>
            </article>

            <article className="stat-card">
              <span className="stat-icon stat-icon-amber">⚙</span>
              <div>
                <p>Servis aktif</p>
                <strong>{formatNumber(activeServiceCount)}</strong>
                <small>
                  {summary.services.pending} menunggu ·{' '}
                  {summary.services.in_progress} dikerjakan
                </small>
              </div>
            </article>

            <article className="stat-card">
              <span className="stat-icon stat-icon-red">▦</span>
              <div>
                <p>Stok menipis</p>
                <strong>{formatNumber(summary.products.low_stock)}</strong>
                <small>{summary.products.out_of_stock} produk habis</small>
              </div>
            </article>

            <article className="stat-card">
              <span className="stat-icon stat-icon-green">▤</span>
              <div>
                <p>Pembelian bulan ini</p>
                <strong>{formatCurrency(summary.purchases.month_total)}</strong>
                <small>{summary.purchases.month_count} pembelian</small>
              </div>
            </article>
          </div>

          <div className="dashboard-grid">
            <article className="panel">
              <div className="panel-header">
                <div>
                  <h2>Ringkasan Penjualan</h2>
                  <p>Akumulasi transaksi yang sudah selesai.</p>
                </div>
                <Link className="text-link" to="/sales">
                  Lihat semua
                </Link>
              </div>

              <dl className="summary-list">
                <div>
                  <dt>Hari ini</dt>
                  <dd>
                    {formatCurrency(summary.sales.today_total)}
                    <span>{summary.sales.today_count} transaksi</span>
                  </dd>
                </div>
                <div>
                  <dt>Bulan ini</dt>
                  <dd>
                    {formatCurrency(summary.sales.month_total)}
                    <span>{summary.sales.month_count} transaksi</span>
                  </dd>
                </div>
                <div>
                  <dt>Total keseluruhan</dt>
                  <dd>
                    {formatCurrency(summary.sales.total_revenue)}
                    <span>{summary.sales.total_count} transaksi</span>
                  </dd>
                </div>
              </dl>
            </article>

            <article className="panel">
              <div className="panel-header">
                <div>
                  <h2>Status Servis</h2>
                  <p>Distribusi pekerjaan servis saat ini.</p>
                </div>
                <Link className="text-link" to="/services">
                  Kelola
                </Link>
              </div>

              <div className="service-status-grid">
                <div>
                  <span className="status-dot status-dot-amber" />
                  <strong>{summary.services.pending}</strong>
                  <small>Menunggu</small>
                </div>
                <div>
                  <span className="status-dot status-dot-blue" />
                  <strong>{summary.services.in_progress}</strong>
                  <small>Dikerjakan</small>
                </div>
                <div>
                  <span className="status-dot status-dot-green" />
                  <strong>{summary.services.completed}</strong>
                  <small>Selesai</small>
                </div>
                <div>
                  <span className="status-dot status-dot-red" />
                  <strong>{summary.services.cancelled}</strong>
                  <small>Dibatalkan</small>
                </div>
              </div>

              <p className="panel-note">
                {summary.services.unpaid} servis belum lunas.
              </p>
            </article>
          </div>

          <div className="dashboard-grid">
            <article className="panel">
              <div className="panel-header">
                <div>
                  <h2>Stok Menipis</h2>
                  <p>Produk dengan stok ≤ 5.</p>
                </div>
                <Link className="text-link" to="/inventory">
                  Inventaris
                </Link>
              </div>

              {summary.low_stock_products.length === 0 ? (
                <p className="empty-text">Semua stok produk aman.</p>
              ) : (
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Produk</th>
                        <th>SKU</th>
                        <th className="align-right">Stok</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.low_stock_products.map((product) => (
                        <tr key={product.id}>
                          <td>{product.name}</td>
                          <td className="mono">{product.sku}</td>
                          <td className="align-right">
                            <StatusBadge
                              status={product.stock === 0 ? 'out' : 'pending'}
                              label={`${product.stock}`}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </article>

            <article className="panel">
              <div className="panel-header">
                <div>
                  <h2>Penjualan Terbaru</h2>
                  <p>5 transaksi terakhir.</p>
                </div>
              </div>

              {summary.recent_sales.length === 0 ? (
                <p className="empty-text">Belum ada penjualan.</p>
              ) : (
                <ul className="activity-list">
                  {summary.recent_sales.map((sale) => (
                    <li key={sale.id}>
                      <div>
                        <strong>{sale.invoice_number}</strong>
                        <span>{formatDateTime(sale.created_at)}</span>
                      </div>
                      <span className="activity-amount">
                        {formatCurrency(sale.total)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          </div>

          <article className="panel">
            <div className="panel-header">
              <div>
                <h2>Servis Aktif</h2>
                <p>Pekerjaan yang masih menunggu atau sedang dikerjakan.</p>
              </div>
              <Link className="text-link" to="/services">
                Lihat semua
              </Link>
            </div>

            {summary.active_services.length === 0 ? (
              <p className="empty-text">Tidak ada servis aktif.</p>
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>No. Servis</th>
                      <th>Pelanggan</th>
                      <th>Kendaraan</th>
                      <th>Status</th>
                      <th>Masuk</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.active_services.map((service) => (
                      <tr key={service.id}>
                        <td className="mono">{service.service_number}</td>
                        <td>{service.customer_name}</td>
                        <td className="mono">{service.vehicle_plate}</td>
                        <td>
                          <StatusBadge
                            status={service.status}
                            label={serviceStatusLabels[service.status]}
                          />
                        </td>
                        <td>{formatDateTime(service.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </article>
        </>
      )}
    </section>
  )
}
