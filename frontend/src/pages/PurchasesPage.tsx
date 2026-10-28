import { useEffect, useMemo, useState } from 'react'

import Modal from '../components/Modal'
import PageHeader from '../components/PageHeader'
import Pagination from '../components/Pagination'
import { listProducts } from '../services/products'
import {
  createPurchase,
  getPurchase,
  listPurchases,
} from '../services/purchases'
import type { Product, Purchase } from '../types'
import {
  formatCurrency,
  formatDateTime,
  formatNumber,
} from '../utils/format'

const PAGE_SIZE = 10

interface PurchaseLine {
  product: Product
  quantity: number
  unitCost: number
}

function createInvoiceNumber(): string {
  const now = new Date()
  const pad = (value: number) => String(value).padStart(2, '0')

  return [
    'PO',
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
    pad(now.getHours()),
    pad(now.getMinutes()),
    pad(now.getSeconds()),
  ].join('-')
}

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  const [detail, setDetail] = useState<Purchase | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const [createOpen, setCreateOpen] = useState(false)
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [supplier, setSupplier] = useState('')
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState<PurchaseLine[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [productsLoading, setProductsLoading] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [unitCost, setUnitCost] = useState('')
  const [saving, setSaving] = useState(false)
  const [createError, setCreateError] = useState('')

  useEffect(() => {
    let active = true

    async function load() {
      setLoading(true)

      try {
        const result = await listPurchases({ page, limit: PAGE_SIZE })

        if (active) {
          setPurchases(result.data)
          setTotal(result.meta.total)
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error ? err.message : 'Gagal memuat pembelian',
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
    setInvoiceNumber(createInvoiceNumber())
    setSupplier('')
    setNotes('')
    setLines([])
    setSelectedProduct('')
    setQuantity('1')
    setUnitCost('')
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

  async function openDetail(purchase: Purchase) {
    setDetail(purchase)
    setDetailLoading(true)

    try {
      const result = await getPurchase(purchase.id)
      setDetail(result.data)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Gagal memuat detail pembelian',
      )
    } finally {
      setDetailLoading(false)
    }
  }

  function handleProductChange(value: string) {
    setSelectedProduct(value)

    const product = products.find((item) => item.id === Number(value))
    setUnitCost(product ? String(product.purchase_price) : '')
  }

  function addLine() {
    setCreateError('')

    const product = products.find(
      (item) => item.id === Number(selectedProduct),
    )

    if (!product) {
      setCreateError('Pilih produk terlebih dahulu.')
      return
    }

    const qty = Number(quantity)
    const cost = Number(unitCost)

    if (!Number.isInteger(qty) || qty <= 0) {
      setCreateError('Jumlah harus berupa angka positif.')
      return
    }

    if (!Number.isFinite(cost) || cost <= 0) {
      setCreateError('Harga satuan harus lebih dari 0.')
      return
    }

    setLines((current) => {
      const existing = current.find(
        (line) => line.product.id === product.id,
      )

      if (existing) {
        return current.map((line) =>
          line.product.id === product.id
            ? { ...line, quantity: line.quantity + qty, unitCost: cost }
            : line,
        )
      }

      return [...current, { product, quantity: qty, unitCost: cost }]
    })

    setSelectedProduct('')
    setQuantity('1')
    setUnitCost('')
  }

  const totalAmount = useMemo(
    () =>
      lines.reduce(
        (sum, line) => sum + line.quantity * line.unitCost,
        0,
      ),
    [lines],
  )

  async function handleCreate() {
    if (lines.length === 0) {
      setCreateError('Tambahkan minimal satu item pembelian.')
      return
    }

    setSaving(true)
    setCreateError('')

    try {
      await createPurchase({
        invoice_number: invoiceNumber.trim(),
        supplier_name:
          supplier.trim() === '' ? null : supplier.trim(),
        notes: notes.trim() === '' ? null : notes.trim(),
        items: lines.map((line) => ({
          product_id: line.product.id,
          quantity: line.quantity,
          unit_cost: line.unitCost,
        })),
      })

      setCreateOpen(false)
      setNotice('Pembelian berhasil disimpan dan stok diperbarui.')
      setReloadKey((value) => value + 1)
    } catch (err) {
      setCreateError(
        err instanceof Error ? err.message : 'Gagal menyimpan pembelian',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <section>
      <PageHeader
        title="Pembelian"
        description="Catat pembelian spare part dari supplier dan perbarui stok."
        actions={
          <button
            type="button"
            className="button button-primary"
            onClick={() => void openCreate()}
          >
            + Pembelian Baru
          </button>
        }
      />

      {error && <div className="alert alert-error">{error}</div>}
      {notice && <div className="alert alert-success">{notice}</div>}

      <article className="panel">
        {loading ? (
          <div className="loading-row">Memuat pembelian…</div>
        ) : purchases.length === 0 ? (
          <p className="empty-text">Belum ada transaksi pembelian.</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Supplier</th>
                  <th>Waktu</th>
                  <th className="align-right">Subtotal</th>
                  <th>Catatan</th>
                  <th className="align-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {purchases.map((purchase) => (
                  <tr key={purchase.id}>
                    <td className="mono">{purchase.invoice_number}</td>
                    <td>{purchase.supplier_name ?? '-'}</td>
                    <td>{formatDateTime(purchase.created_at)}</td>
                    <td className="align-right">
                      <strong>{formatCurrency(purchase.subtotal)}</strong>
                    </td>
                    <td>{purchase.notes ?? '-'}</td>
                    <td className="align-right">
                      <button
                        type="button"
                        className="button button-ghost button-small"
                        onClick={() => void openDetail(purchase)}
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
          title="Detail Pembelian"
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
                  <dt>Supplier</dt>
                  <dd>{detail.supplier_name ?? '-'}</dd>
                </div>
                <div>
                  <dt>Waktu</dt>
                  <dd>{formatDateTime(detail.created_at)}</dd>
                </div>
                <div className="field-span">
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
                      <th className="align-right">Harga Satuan</th>
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
                          {formatCurrency(item.unit_cost)}
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
                <strong>{formatCurrency(detail.subtotal)}</strong>
              </div>
            </>
          )}
        </Modal>
      )}

      {createOpen && (
        <Modal
          title="Pembelian Baru"
          subtitle="Stok produk akan otomatis bertambah setelah disimpan."
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
                disabled={saving || lines.length === 0}
                onClick={() => void handleCreate()}
              >
                {saving ? 'Menyimpan…' : 'Simpan Pembelian'}
              </button>
            </>
          }
        >
          {createError && <div className="alert alert-error">{createError}</div>}

          <div className="form-grid">
            <label className="field">
              <span>Nomor faktur</span>
              <input
                className="input"
                required
                maxLength={50}
                value={invoiceNumber}
                onChange={(event) => setInvoiceNumber(event.target.value)}
              />
            </label>

            <label className="field">
              <span>Supplier</span>
              <input
                className="input"
                maxLength={150}
                placeholder="Opsional"
                value={supplier}
                onChange={(event) => setSupplier(event.target.value)}
              />
            </label>

            <label className="field field-span">
              <span>Catatan</span>
              <input
                className="input"
                placeholder="Opsional"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
              />
            </label>
          </div>

          {productsLoading ? (
            <div className="loading-row">Memuat produk…</div>
          ) : (
            <div className="purchase-picker">
              <label className="field">
                <span>Produk</span>
                <select
                  className="input"
                  value={selectedProduct}
                  onChange={(event) => handleProductChange(event.target.value)}
                >
                  <option value="">Pilih produk…</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} · stok {product.stock}
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

              <label className="field">
                <span>Harga satuan</span>
                <input
                  className="input"
                  type="number"
                  min="1"
                  step="1"
                  value={unitCost}
                  onChange={(event) => setUnitCost(event.target.value)}
                />
              </label>

              <button
                type="button"
                className="button button-primary"
                onClick={addLine}
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
                  <th className="align-right">Qty</th>
                  <th className="align-right">Harga</th>
                  <th className="align-right">Subtotal</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {lines.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="empty-text">
                      Belum ada item pembelian.
                    </td>
                  </tr>
                ) : (
                  lines.map((line) => (
                    <tr key={line.product.id}>
                      <td>{line.product.name}</td>
                      <td className="align-right">
                        {formatNumber(line.quantity)}
                      </td>
                      <td className="align-right">
                        {formatCurrency(line.unitCost)}
                      </td>
                      <td className="align-right">
                        {formatCurrency(line.quantity * line.unitCost)}
                      </td>
                      <td className="align-right">
                        <button
                          type="button"
                          className="button button-danger button-small"
                          onClick={() =>
                            setLines((current) =>
                              current.filter(
                                (item) =>
                                  item.product.id !== line.product.id,
                              ),
                            )
                          }
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

          <div className="detail-total">
            <span>Total</span>
            <strong>{formatCurrency(totalAmount)}</strong>
          </div>
        </Modal>
      )}
    </section>
  )
}
