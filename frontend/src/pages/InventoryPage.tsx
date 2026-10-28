import { useEffect, useState, type FormEvent } from 'react'

import Modal from '../components/Modal'
import PageHeader from '../components/PageHeader'
import Pagination from '../components/Pagination'
import StatusBadge from '../components/StatusBadge'
import { useAuth } from '../context/AuthContext'
import {
  createProduct,
  deleteProduct,
  listProducts,
  updateProduct,
} from '../services/products'
import { createMovement, listMovements } from '../services/stock'
import type { Product, StockMovement } from '../types'
import {
  formatCurrency,
  formatDateTime,
  formatNumber,
  movementTypeLabels,
} from '../utils/format'

type Tab = 'products' | 'movements'

const PAGE_SIZE = 10

interface ProductFormState {
  name: string
  sku: string
  category: string
  purchasePrice: string
  sellingPrice: string
}

interface StockFormState {
  movementType: 'in' | 'out' | 'adjustment'
  direction: 'increase' | 'decrease'
  quantity: string
  notes: string
}

const emptyProductForm: ProductFormState = {
  name: '',
  sku: '',
  category: '',
  purchasePrice: '',
  sellingPrice: '',
}

const emptyStockForm: StockFormState = {
  movementType: 'in',
  direction: 'increase',
  quantity: '',
  notes: '',
}

export default function InventoryPage() {
  const { hasRole } = useAuth()
  const canManage = hasRole('owner', 'admin')

  const [tab, setTab] = useState<Tab>('products')

  const [products, setProducts] = useState<Product[]>([])
  const [productPage, setProductPage] = useState(1)
  const [productTotal, setProductTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [productsLoading, setProductsLoading] = useState(true)

  const [movements, setMovements] = useState<StockMovement[]>([])
  const [movementPage, setMovementPage] = useState(1)
  const [movementTotal, setMovementTotal] = useState(0)
  const [movementsLoading, setMovementsLoading] = useState(true)

  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  const [productModal, setProductModal] = useState<
    { mode: 'create' } | { mode: 'edit'; product: Product } | null
  >(null)
  const [productForm, setProductForm] =
    useState<ProductFormState>(emptyProductForm)
  const [savingProduct, setSavingProduct] = useState(false)
  const [formError, setFormError] = useState('')

  const [stockProduct, setStockProduct] = useState<Product | null>(null)
  const [stockForm, setStockForm] = useState<StockFormState>(emptyStockForm)
  const [savingStock, setSavingStock] = useState(false)
  const [stockError, setStockError] = useState('')

  useEffect(() => {
    let active = true

    async function load() {
      setProductsLoading(true)

      try {
        const result = await listProducts({
          page: productPage,
          limit: PAGE_SIZE,
          search: appliedSearch,
        })

        if (active) {
          setProducts(result.data)
          setProductTotal(result.meta.total)
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error ? err.message : 'Gagal memuat produk',
          )
        }
      } finally {
        if (active) {
          setProductsLoading(false)
        }
      }
    }

    void load()

    return () => {
      active = false
    }
  }, [productPage, appliedSearch, reloadKey])

  useEffect(() => {
    if (!canManage || tab !== 'movements') {
      return
    }

    let active = true

    async function load() {
      setMovementsLoading(true)

      try {
        const result = await listMovements({
          page: movementPage,
          limit: PAGE_SIZE,
        })

        if (active) {
          setMovements(result.data)
          setMovementTotal(result.meta.total)
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error ? err.message : 'Gagal memuat riwayat stok',
          )
        }
      } finally {
        if (active) {
          setMovementsLoading(false)
        }
      }
    }

    void load()

    return () => {
      active = false
    }
  }, [movementPage, reloadKey, canManage, tab])

  function refresh(message: string) {
    setNotice(message)
    setError('')
    setReloadKey((value) => value + 1)
  }

  function openCreateProduct() {
    setProductForm(emptyProductForm)
    setFormError('')
    setProductModal({ mode: 'create' })
  }

  function openEditProduct(product: Product) {
    setProductForm({
      name: product.name,
      sku: product.sku,
      category: product.category ?? '',
      purchasePrice: String(product.purchase_price),
      sellingPrice: String(product.selling_price),
    })
    setFormError('')
    setProductModal({ mode: 'edit', product })
  }

  function openStockModal(product: Product) {
    setStockForm(emptyStockForm)
    setStockError('')
    setStockProduct(product)
  }

  async function handleProductSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!productModal) return

    setSavingProduct(true)
    setFormError('')

    try {
      const category = productForm.category.trim()

      if (productModal.mode === 'create') {
        await createProduct({
          name: productForm.name.trim(),
          sku: productForm.sku.trim(),
          category: category === '' ? null : category,
          purchase_price: Number(productForm.purchasePrice || 0),
          selling_price: Number(productForm.sellingPrice || 0),
        })
        refresh('Produk berhasil ditambahkan.')
      } else {
        await updateProduct(productModal.product.id, {
          name: productForm.name.trim(),
          sku: productForm.sku.trim(),
          category: category === '' ? null : category,
          selling_price: Number(productForm.sellingPrice || 0),
        })
        refresh('Produk berhasil diperbarui.')
      }

      setProductModal(null)
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'Gagal menyimpan produk',
      )
    } finally {
      setSavingProduct(false)
    }
  }

  async function handleDeleteProduct(product: Product) {
    const confirmed = window.confirm(
      `Nonaktifkan produk "${product.name}"? Produk tidak akan tampil di daftar.`,
    )

    if (!confirmed) return

    try {
      await deleteProduct(product.id)
      refresh('Produk berhasil dinonaktifkan.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menghapus produk')
    }
  }

  async function handleStockSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!stockProduct) return

    setSavingStock(true)
    setStockError('')

    try {
      await createMovement({
        product_id: stockProduct.id,
        movement_type: stockForm.movementType,
        quantity: Number(stockForm.quantity || 0),
        adjustment_direction:
          stockForm.movementType === 'adjustment'
            ? stockForm.direction
            : undefined,
        notes: stockForm.notes.trim() === '' ? null : stockForm.notes.trim(),
      })

      refresh('Pergerakan stok berhasil dicatat.')
      setStockProduct(null)
    } catch (err) {
      setStockError(
        err instanceof Error ? err.message : 'Gagal mencatat pergerakan stok',
      )
    } finally {
      setSavingStock(false)
    }
  }

  return (
    <section>
      <PageHeader
        title="Inventaris"
        description="Kelola produk, harga, stok, dan riwayat pergerakan stok."
        actions={
          canManage && (
            <button
              type="button"
              className="button button-primary"
              onClick={openCreateProduct}
            >
              + Produk Baru
            </button>
          )
        }
      />

      {error && <div className="alert alert-error">{error}</div>}
      {notice && <div className="alert alert-success">{notice}</div>}

      <div className="tabs">
        <button
          type="button"
          className={tab === 'products' ? 'tab active' : 'tab'}
          onClick={() => setTab('products')}
        >
          Produk
        </button>
        {canManage && (
          <button
            type="button"
            className={tab === 'movements' ? 'tab active' : 'tab'}
            onClick={() => setTab('movements')}
          >
            Riwayat Stok
          </button>
        )}
      </div>

      {tab === 'products' && (
        <article className="panel">
          <form
            className="toolbar"
            onSubmit={(event) => {
              event.preventDefault()
              setProductPage(1)
              setAppliedSearch(search.trim())
            }}
          >
            <input
              className="input"
              type="search"
              placeholder="Cari nama atau SKU produk…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <button type="submit" className="button button-ghost">
              Cari
            </button>
            {appliedSearch && (
              <button
                type="button"
                className="button button-ghost"
                onClick={() => {
                  setSearch('')
                  setAppliedSearch('')
                  setProductPage(1)
                }}
              >
                Reset
              </button>
            )}
          </form>

          {productsLoading ? (
            <div className="loading-row">Memuat produk…</div>
          ) : products.length === 0 ? (
            <p className="empty-text">Belum ada produk yang cocok.</p>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Produk</th>
                    <th>SKU</th>
                    <th>Kategori</th>
                    <th className="align-right">Harga Beli</th>
                    <th className="align-right">Harga Jual</th>
                    <th className="align-right">Stok</th>
                    {canManage && <th className="align-right">Aksi</th>}
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr key={product.id}>
                      <td>
                        <strong>{product.name}</strong>
                      </td>
                      <td className="mono">{product.sku}</td>
                      <td>{product.category ?? '-'}</td>
                      <td className="align-right">
                        {formatCurrency(product.purchase_price)}
                      </td>
                      <td className="align-right">
                        {formatCurrency(product.selling_price)}
                      </td>
                      <td className="align-right">
                        <StatusBadge
                          status={
                            product.stock === 0
                              ? 'out'
                              : product.stock <= 5
                                ? 'pending'
                                : 'in'
                          }
                          label={formatNumber(product.stock)}
                        />
                      </td>
                      {canManage && (
                        <td className="align-right">
                          <div className="row-actions">
                            <button
                              type="button"
                              className="button button-ghost button-small"
                              onClick={() => openStockModal(product)}
                            >
                              Stok
                            </button>
                            <button
                              type="button"
                              className="button button-ghost button-small"
                              onClick={() => openEditProduct(product)}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="button button-danger button-small"
                              onClick={() => handleDeleteProduct(product)}
                            >
                              Hapus
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <Pagination
            page={productPage}
            limit={PAGE_SIZE}
            total={productTotal}
            onPageChange={setProductPage}
          />
        </article>
      )}

      {tab === 'movements' && (
        <article className="panel">
          {movementsLoading ? (
            <div className="loading-row">Memuat riwayat stok…</div>
          ) : movements.length === 0 ? (
            <p className="empty-text">Belum ada pergerakan stok.</p>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Waktu</th>
                    <th>Produk ID</th>
                    <th>Jenis</th>
                    <th className="align-right">Jumlah</th>
                    <th className="align-right">Stok Sebelum</th>
                    <th className="align-right">Stok Sesudah</th>
                    <th>Catatan</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.map((movement) => (
                    <tr key={movement.id}>
                      <td>{formatDateTime(movement.created_at)}</td>
                      <td className="mono">#{movement.product_id}</td>
                      <td>
                        <StatusBadge
                          status={movement.movement_type}
                          label={movementTypeLabels[movement.movement_type]}
                        />
                      </td>
                      <td className="align-right">
                        {formatNumber(movement.quantity)}
                      </td>
                      <td className="align-right">
                        {formatNumber(movement.stock_before)}
                      </td>
                      <td className="align-right">
                        {formatNumber(movement.stock_after)}
                      </td>
                      <td>{movement.notes ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <Pagination
            page={movementPage}
            limit={PAGE_SIZE}
            total={movementTotal}
            onPageChange={setMovementPage}
          />
        </article>
      )}

      {productModal && (
        <Modal
          title={
            productModal.mode === 'create' ? 'Produk Baru' : 'Edit Produk'
          }
          subtitle="Lengkapi data produk dengan benar."
          onClose={() => setProductModal(null)}
        >
          <form className="form-grid" onSubmit={handleProductSubmit}>
            {formError && (
              <div className="alert alert-error field-span">{formError}</div>
            )}

            <label className="field field-span">
              <span>Nama produk</span>
              <input
                className="input"
                required
                maxLength={150}
                value={productForm.name}
                onChange={(event) =>
                  setProductForm((form) => ({
                    ...form,
                    name: event.target.value,
                  }))
                }
              />
            </label>

            <label className="field">
              <span>SKU</span>
              <input
                className="input"
                required
                maxLength={50}
                value={productForm.sku}
                onChange={(event) =>
                  setProductForm((form) => ({
                    ...form,
                    sku: event.target.value,
                  }))
                }
              />
            </label>

            <label className="field">
              <span>Kategori</span>
              <input
                className="input"
                maxLength={100}
                placeholder="Opsional"
                value={productForm.category}
                onChange={(event) =>
                  setProductForm((form) => ({
                    ...form,
                    category: event.target.value,
                  }))
                }
              />
            </label>

            {productModal.mode === 'create' && (
              <label className="field">
                <span>Harga beli</span>
                <input
                  className="input"
                  type="number"
                  min="0"
                  step="1"
                  required
                  value={productForm.purchasePrice}
                  onChange={(event) =>
                    setProductForm((form) => ({
                      ...form,
                      purchasePrice: event.target.value,
                    }))
                  }
                />
              </label>
            )}

            <label className="field">
              <span>Harga jual</span>
              <input
                className="input"
                type="number"
                min="0"
                step="1"
                required
                value={productForm.sellingPrice}
                onChange={(event) =>
                  setProductForm((form) => ({
                    ...form,
                    sellingPrice: event.target.value,
                  }))
                }
              />
            </label>

            <div className="form-actions field-span">
              <button
                type="button"
                className="button button-ghost"
                onClick={() => setProductModal(null)}
              >
                Batal
              </button>
              <button
                type="submit"
                className="button button-primary"
                disabled={savingProduct}
              >
                {savingProduct ? 'Menyimpan…' : 'Simpan'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {stockProduct && (
        <Modal
          title="Catat Pergerakan Stok"
          subtitle={`${stockProduct.name} · stok saat ini ${stockProduct.stock}`}
          onClose={() => setStockProduct(null)}
        >
          <form className="form-grid" onSubmit={handleStockSubmit}>
            {stockError && (
              <div className="alert alert-error field-span">{stockError}</div>
            )}

            <label className="field">
              <span>Jenis pergerakan</span>
              <select
                className="input"
                value={stockForm.movementType}
                onChange={(event) =>
                  setStockForm((form) => ({
                    ...form,
                    movementType: event.target
                      .value as StockFormState['movementType'],
                  }))
                }
              >
                <option value="in">Stok masuk</option>
                <option value="out">Stok keluar</option>
                <option value="adjustment">Koreksi stok</option>
              </select>
            </label>

            {stockForm.movementType === 'adjustment' && (
              <label className="field">
                <span>Arah koreksi</span>
                <select
                  className="input"
                  value={stockForm.direction}
                  onChange={(event) =>
                    setStockForm((form) => ({
                      ...form,
                      direction: event.target
                        .value as StockFormState['direction'],
                    }))
                  }
                >
                  <option value="increase">Tambah stok</option>
                  <option value="decrease">Kurangi stok</option>
                </select>
              </label>
            )}

            <label className="field">
              <span>Jumlah</span>
              <input
                className="input"
                type="number"
                min="1"
                step="1"
                required
                value={stockForm.quantity}
                onChange={(event) =>
                  setStockForm((form) => ({
                    ...form,
                    quantity: event.target.value,
                  }))
                }
              />
            </label>

            <label className="field field-span">
              <span>Catatan</span>
              <textarea
                className="input"
                rows={2}
                placeholder="Opsional"
                value={stockForm.notes}
                onChange={(event) =>
                  setStockForm((form) => ({
                    ...form,
                    notes: event.target.value,
                  }))
                }
              />
            </label>

            <div className="form-actions field-span">
              <button
                type="button"
                className="button button-ghost"
                onClick={() => setStockProduct(null)}
              >
                Batal
              </button>
              <button
                type="submit"
                className="button button-primary"
                disabled={savingStock}
              >
                {savingStock ? 'Menyimpan…' : 'Simpan'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </section>
  )
}
