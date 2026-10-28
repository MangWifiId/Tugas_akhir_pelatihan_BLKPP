import { useEffect, useMemo, useState } from 'react'

import Modal from '../components/Modal'
import PageHeader from '../components/PageHeader'
import Pagination from '../components/Pagination'
import StatusBadge from '../components/StatusBadge'
import { useAuth } from '../context/AuthContext'
import { listProducts } from '../services/products'
import { createSale, getSale, listSales } from '../services/sales'
import type { Product, Sale } from '../types'
import {
  formatCurrency,
  formatDateTime,
  formatNumber,
  statusTone,
} from '../utils/format'

const PAGE_SIZE = 10

interface CartItem {
  product: Product
  quantity: number
}

export default function SalesPage() {
  const { hasRole } = useAuth()
  const canManage = hasRole('owner', 'admin')

  const [sales, setSales] = useState<Sale[]>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  const [detail, setDetail] = useState<Sale | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const [createOpen, setCreateOpen] = useState(false)
  const [products, setProducts] = useState<Product[]>([])
  const [productsLoading, setProductsLoading] = useState(false)
  const [cart, setCart] = useState<CartItem[]>([])
  const [selectedProduct, setSelectedProduct] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [createError, setCreateError] = useState('')

  useEffect(() => {
    let active = true

    async function load() {
      setLoading(true)

      try {
        const result = await listSales({ page, limit: PAGE_SIZE })

        if (active) {
          setSales(result.data)
          setTotal(result.meta.total)
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error ? err.message : 'Gagal memuat penjualan',
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
  }, [page, reloadKey])

  async function openCreate() {
    setCreateOpen(true)
    setCart([])
    setSelectedProduct('')
    setQuantity('1')
    setNotes('')
    setCreateError('')
    setProductsLoading(true)

    try {
      const result = await listProducts({ page: 1, limit: 100 })
      setProducts(result.data)
    } catch (err) {
      setCreateError(
        err instanceof Error ? err.message : 'Gagal memuat produk',
      )
    } finally {
      setProductsLoading(false)
    }
  }

  async function openDetail(sale: Sale) {
    setDetail(sale)
    setDetailLoading(true)

    try {
      const result = await getSale(sale.id)
      setDetail(result.data)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Gagal memuat detail penjualan',
      )
    } finally {
      setDetailLoading(false)
    }
  }

  const cartTotal = useMemo(
    () =>
      cart.reduce(
        (sum, item) => sum + item.product.selling_price * item.quantity,
        0,
      ),
    [cart],
  )

  function addToCart() {
    setCreateError('')

    const product = products.find(
      (item) => item.id === Number(selectedProduct),
    )

    if (!product) {
      setCreateError('Pilih produk terlebih dahulu.')
      return
    }

    const qty = Number(quantity)

    if (!Number.isInteger(qty) || qty <= 0) {
      setCreateError('Jumlah harus berupa angka positif.')
      return
    }

    if (qty > product.stock) {
      setCreateError(`Stok ${product.name} hanya ${product.stock}.`)
      return
    }

    setCart((current) => {
      const existing = current.find(
        (item) => item.product.id === product.id,
      )

      if (existing) {
        const nextQuantity = existing.quantity + qty

        if (nextQuantity > product.stock) {
          setCreateError(
            `Total jumlah ${product.name} melebihi stok (${product.stock}).`,
          )
          return current
        }

        return current.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: nextQuantity }
            : item,
        )
      }

      return [...current, { product, quantity: qty }]
    })

    setSelectedProduct('')
    setQuantity('1')
  }

  function updateCartQuantity(productId: number, nextQuantity: number) {
    setCart((current) =>
      current.map((item) => {
        if (item.product.id !== productId) return item

        const bounded = Math.min(
          Math.max(1, nextQuantity),
          item.product.stock,
        )

        return { ...item, quantity: bounded }
      }),
    )
  }

  function removeFromCart(productId: number) {
    setCart((current) =>
      current.filter((item) => item.product.id !== productId),
    )
  }

  async function handleCreate() {
    if (cart.length === 0) {
      setCreateError('Tambahkan minimal satu produk ke transaksi.')
      return
    }

    setSaving(true)
    setCreateError('')

    try {
      await createSale({
        items: cart.map((item) => ({
          product_id: item.product.id,
          quantity: item.quantity,
        })),
        notes: notes.trim() === '' ? null : notes.trim(),
      })

      setCreateOpen(false)
      setNotice('Transaksi penjualan berhasil disimpan.')
      setReloadKey((value) => value + 1)
    } catch (err) {
      setCreateError(
        err instanceof Error ? err.message : 'Gagal menyimpan penjualan',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <section>
      <PageHeader
        title="Penjualan"
        description="Catat transaksi penjualan spare part dan lihat riwayatnya."
        actions={
          canManage && (
            <button
              type="button"
              className="button button-primary"
              onClick={() => void openCreate()}
            >
              + Transaksi Baru
            </button>
          )
        }
      />

      {error && <div className="alert alert-error">{error}</div>}
      {notice && <div className="alert alert-success">{notice}</div>}

      <article className="panel">
        {loading ? (
          <div className="loading-row">Memuat penjualan…</div>
        ) : sales.length === 0 ? (
          <p className="empty-text">Belum ada transaksi penjualan.</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Waktu</th>
                  <th className="align-right">Subtotal</th>
                  <th className="align-right">Diskon</th>
                  <th className="align-right">Total</th>
                  <th>Pembayaran</th>
                  <th>Status</th>
                  <th className="align-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {sales.map((sale) => (
                  <tr key={sale.id}>
                    <td className="mono">{sale.invoice_number}</td>
                    <td>{formatDateTime(sale.created_at)}</td>
                    <td className="align-right">
                      {formatCurrency(sale.subtotal)}
                    </td>
                    <td className="align-right">
                      {formatCurrency(sale.discount)}
                    </td>
                    <td className="align-right">
                      <strong>{formatCurrency(sale.total)}</strong>
                    </td>
                    <td className="capitalize">{sale.payment_method}</td>
                    <td>
                      <StatusBadge
                        status={sale.status}
                        label={statusTone(sale.status) === 'success' ? 'Selesai' : sale.status}
                      />
                    </td>
                    <td className="align-right">
                      <button
                        type="button"
                        className="button button-ghost button-small"
                        onClick={() => void openDetail(sale)}
                      >
                        Detail
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          page={page}
          limit={PAGE_SIZE}
          total={total}
          onPageChange={setPage}
        />
      </article>

      {detail && (
        <Modal
          title="Detail Penjualan"
          subtitle={detail.invoice_number}
          onClose={() => setDetail(null)}
          size="wide"
        >
          {detailLoading ? (
            <div className="loading-row">Memuat detail…</div>
          ) : (
            <>
              <dl className="detail-grid">
                <div>
                  <dt>Waktu transaksi</dt>
                  <dd>{formatDateTime(detail.created_at)}</dd>
                </div>
                <div>
                  <dt>Metode pembayaran</dt>
                  <dd className="capitalize">{detail.payment_method}</dd>
                </div>
                <div>
                  <dt>Status</dt>
                  <dd>
                    <StatusBadge
                      status={detail.status}
                      label={statusTone(detail.status) === 'success' ? 'Selesai' : detail.status}
                    />
                  </dd>
                </div>
                <div>
                  <dt>Catatan</dt>
                  <dd>{detail.notes ?? '-'}</dd>
                </div>
              </dl>

              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Produk</th>
                      <th className="align-right">Qty</th>
                      <th className="align-right">Harga</th>
                      <th className="align-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(detail.items ?? []).map((item) => (
                      <tr key={item.id}>
                        <td>{item.product_name || `Produk #${item.product_id}`}</td>
                        <td className="align-right">
                          {formatNumber(item.quantity)}
                        </td>
                        <td className="align-right">
                          {formatCurrency(item.unit_price)}
                        </td>
                        <td className="align-right">
                          {formatCurrency(item.subtotal)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="detail-total">
                <span>Total</span>
                <strong>{formatCurrency(detail.total)}</strong>
              </div>
            </>
          )}
        </Modal>
      )}

      {createOpen && (
        <Modal
          title="Transaksi Penjualan Baru"
          subtitle="Pembayaran tunai otomatis diselesaikan saat transaksi disimpan."
          onClose={() => setCreateOpen(false)}
          size="wide"
          footer={
            <>
              <button
                type="button"
                className="button button-ghost"
                onClick={() => setCreateOpen(false)}
              >
                Batal
              </button>
              <button
                type="button"
                className="button button-primary"
                disabled={saving || cart.length === 0}
                onClick={() => void handleCreate()}
              >
                {saving ? 'Menyimpan…' : 'Simpan Transaksi'}
              </button>
            </>
          }
        >
          {createError && <div className="alert alert-error">{createError}</div>}

          {productsLoading ? (
            <div className="loading-row">Memuat produk…</div>
          ) : (
            <div className="sale-picker">
              <label className="field">
                <span>Produk</span>
                <select
                  className="input"
                  value={selectedProduct}
                  onChange={(event) => setSelectedProduct(event.target.value)}
                >
                  <option value="">Pilih produk…</option>
                  {products.map((product) => (
                    <option
                      key={product.id}
                      value={product.id}
                      disabled={product.stock === 0}
                    >
                      {product.name} · {formatCurrency(product.selling_price)} ·
                      stok {product.stock}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>Jumlah</span>
                <input
                  className="input"
                  type="number"
                  min="1"
                  step="1"
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                />
              </label>

              <button
                type="button"
                className="button button-primary"
                onClick={addToCart}
              >
                Tambah
              </button>
            </div>
          )}

          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Produk</th>
                  <th className="align-right">Harga</th>
                  <th className="align-right">Qty</th>
                  <th className="align-right">Subtotal</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {cart.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="empty-text">
                      Belum ada produk pada transaksi.
                    </td>
                  </tr>
                ) : (
                  cart.map((item) => (
                    <tr key={item.product.id}>
                      <td>{item.product.name}</td>
                      <td className="align-right">
                        {formatCurrency(item.product.selling_price)}
                      </td>
                      <td className="align-right">
                        <input
                          className="input input-compact"
                          type="number"
                          min="1"
                          max={item.product.stock}
                          value={item.quantity}
                          onChange={(event) =>
                            updateCartQuantity(
                              item.product.id,
                              Number(event.target.value),
                            )
                          }
                        />
                      </td>
                      <td className="align-right">
                        {formatCurrency(
                          item.product.selling_price * item.quantity,
                        )}
                      </td>
                      <td className="align-right">
                        <button
                          type="button"
                          className="button button-danger button-small"
                          onClick={() => removeFromCart(item.product.id)}
                        >
                          Hapus
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <label className="field">
            <span>Catatan</span>
            <textarea
              className="input"
              rows={2}
              placeholder="Opsional"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </label>

          <div className="detail-total">
            <span>Total</span>
            <strong>{formatCurrency(cartTotal)}</strong>
          </div>
        </Modal>
      )}
    </section>
  )
}
