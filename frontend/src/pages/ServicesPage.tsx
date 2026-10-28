import { useEffect, useState, type FormEvent } from 'react'

import Modal from '../components/Modal'
import PageHeader from '../components/PageHeader'
import Pagination from '../components/Pagination'
import StatusBadge from '../components/StatusBadge'
import { useAuth } from '../context/AuthContext'
import { listProducts } from '../services/products'
import {
  addServicePart,
  createService,
  createServicePayment,
  getService,
  listServices,
  updateService,
} from '../services/services'
import type {
  Product,
  ServiceStatus,
  WorkshopService,
} from '../types'
import {
  formatCurrency,
  formatDateTime,
  formatNumber,
  paymentStatusLabels,
  serviceStatusLabels,
} from '../utils/format'

const PAGE_SIZE = 10

const statusOptions: Array<{ value: ServiceStatus | ''; label: string }> = [
  { value: '', label: 'Semua status' },
  { value: 'pending', label: 'Menunggu' },
  { value: 'in_progress', label: 'Dikerjakan' },
  { value: 'completed', label: 'Selesai' },
  { value: 'cancelled', label: 'Dibatalkan' },
]

interface CreateFormState {
  customerName: string
  customerPhone: string
  vehiclePlate: string
  vehicleBrand: string
  complaint: string
  mechanicName: string
  notes: string
}

interface EditFormState {
  diagnosis: string
  mechanicName: string
  laborCost: string
  status: ServiceStatus
  notes: string
}

const emptyCreateForm: CreateFormState = {
  customerName: '',
  customerPhone: '',
  vehiclePlate: '',
  vehicleBrand: '',
  complaint: '',
  mechanicName: '',
  notes: '',
}

export default function ServicesPage() {
  const { hasRole } = useAuth()
  const canCreate = hasRole('owner', 'admin')

  const [services, setServices] = useState<WorkshopService[]>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [appliedSearch, setAppliedSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<ServiceStatus | ''>('')
  const [loading, setLoading] = useState(true)

  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] =
    useState<CreateFormState>(emptyCreateForm)
  const [savingCreate, setSavingCreate] = useState(false)
  const [createError, setCreateError] = useState('')

  const [detail, setDetail] = useState<WorkshopService | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [products, setProducts] = useState<Product[]>([])

  const [editForm, setEditForm] = useState<EditFormState | null>(null)
  const [savingEdit, setSavingEdit] = useState(false)
  const [editError, setEditError] = useState('')

  const [partProductId, setPartProductId] = useState('')
  const [partQuantity, setPartQuantity] = useState('1')
  const [savingPart, setSavingPart] = useState(false)
  const [partError, setPartError] = useState('')

  const [paymentNotes, setPaymentNotes] = useState('')
  const [savingPayment, setSavingPayment] = useState(false)
  const [paymentError, setPaymentError] = useState('')

  useEffect(() => {
    let active = true

    async function load() {
      setLoading(true)

      try {
        const result = await listServices({
          page,
          limit: PAGE_SIZE,
          search: appliedSearch,
          status: statusFilter,
        })

        if (active) {
          setServices(result.data)
          setTotal(result.meta.total)
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error ? err.message : 'Gagal memuat data servis',
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
  }, [page, appliedSearch, statusFilter, reloadKey])

  function refresh(message: string) {
    setNotice(message)
    setError('')
    setReloadKey((value) => value + 1)
  }

  function applyDetail(service: WorkshopService) {
    setDetail(service)
    setEditForm({
      diagnosis: service.diagnosis ?? '',
      mechanicName: service.mechanic_name ?? '',
      laborCost: String(service.labor_cost),
      status: service.status,
      notes: service.notes ?? '',
    })
    setEditError('')
    setPartError('')
    setPaymentError('')
    setPartProductId('')
    setPartQuantity('1')
    setPaymentNotes('')
  }

  async function loadDetail(id: number) {
    setDetailLoading(true)

    try {
      const result = await getService(id)
      applyDetail(result.data)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Gagal memuat detail servis',
      )
      setDetail(null)
    } finally {
      setDetailLoading(false)
    }
  }

  async function openDetail(service: WorkshopService) {
    setDetail(service)
    setDetailLoading(true)
    setEditForm(null)

    try {
      const [serviceResult, productResult] = await Promise.all([
        getService(service.id),
        listProducts({ page: 1, limit: 100 }),
      ])

      applyDetail(serviceResult.data)
      setProducts(productResult.data)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Gagal memuat detail servis',
      )
      setDetail(null)
    } finally {
      setDetailLoading(false)
    }
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSavingCreate(true)
    setCreateError('')

    try {
      await createService({
        customer_name: createForm.customerName.trim(),
        customer_phone:
          createForm.customerPhone.trim() === ''
            ? null
            : createForm.customerPhone.trim(),
        vehicle_plate: createForm.vehiclePlate.trim(),
        vehicle_brand:
          createForm.vehicleBrand.trim() === ''
            ? null
            : createForm.vehicleBrand.trim(),
        complaint: createForm.complaint.trim(),
        mechanic_name:
          createForm.mechanicName.trim() === ''
            ? null
            : createForm.mechanicName.trim(),
        notes:
          createForm.notes.trim() === '' ? null : createForm.notes.trim(),
      })

      setCreateOpen(false)
      setCreateForm(emptyCreateForm)
      refresh('Data servis berhasil dibuat.')
    } catch (err) {
      setCreateError(
        err instanceof Error ? err.message : 'Gagal membuat data servis',
      )
    } finally {
      setSavingCreate(false)
    }
  }

  async function handleUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!detail || !editForm) return

    setSavingEdit(true)
    setEditError('')

    try {
      await updateService(detail.id, {
        diagnosis:
          editForm.diagnosis.trim() === ''
            ? null
            : editForm.diagnosis.trim(),
        mechanic_name:
          editForm.mechanicName.trim() === ''
            ? null
            : editForm.mechanicName.trim(),
        labor_cost: Number(editForm.laborCost || 0),
        status: editForm.status,
        payment_status: detail.payment_status,
        notes: editForm.notes.trim() === '' ? null : editForm.notes.trim(),
      })

      await loadDetail(detail.id)
      refresh('Data servis berhasil diperbarui.')
    } catch (err) {
      setEditError(
        err instanceof Error ? err.message : 'Gagal memperbarui data servis',
      )
    } finally {
      setSavingEdit(false)
    }
  }

  async function handleAddPart(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!detail) return

    setSavingPart(true)
    setPartError('')

    try {
      await addServicePart(detail.id, {
        product_id: Number(partProductId),
        quantity: Number(partQuantity || 0),
      })

      await loadDetail(detail.id)
      refresh('Spare part berhasil ditambahkan.')
    } catch (err) {
      setPartError(
        err instanceof Error ? err.message : 'Gagal menambahkan spare part',
      )
    } finally {
      setSavingPart(false)
    }
  }

  async function handlePayment() {
    if (!detail) return

    setSavingPayment(true)
    setPaymentError('')

    try {
      await createServicePayment(
        detail.id,
        paymentNotes.trim() === '' ? null : paymentNotes.trim(),
      )

      await loadDetail(detail.id)
      refresh('Pembayaran servis berhasil dicatat.')
    } catch (err) {
      setPaymentError(
        err instanceof Error ? err.message : 'Gagal mencatat pembayaran',
      )
    } finally {
      setSavingPayment(false)
    }
  }

  const editable = detail
    ? detail.status === 'pending' || detail.status === 'in_progress'
    : false
  const canPay =
    detail !== null &&
    detail.status === 'completed' &&
    detail.payment_status === 'unpaid'

  return (
    <section>
      <PageHeader
        title="Servis Bengkel"
        description="Kelola pekerjaan servis, spare part, dan pembayaran."
        actions={
          canCreate && (
            <button
              type="button"
              className="button button-primary"
              onClick={() => {
                setCreateForm(emptyCreateForm)
                setCreateError('')
                setCreateOpen(true)
              }}
            >
              + Servis Baru
            </button>
          )
        }
      />

      {error && <div className="alert alert-error">{error}</div>}
      {notice && <div className="alert alert-success">{notice}</div>}

      <article className="panel">
        <div className="toolbar">
          <form
            className="toolbar-group"
            onSubmit={(event) => {
              event.preventDefault()
              setPage(1)
              setAppliedSearch(search.trim())
            }}
          >
            <input
              className="input"
              type="search"
              placeholder="Cari no. servis, pelanggan, atau plat…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <button type="submit" className="button button-ghost">
              Cari
            </button>
          </form>

          <select
            className="input toolbar-select"
            value={statusFilter}
            onChange={(event) => {
              setPage(1)
              setStatusFilter(event.target.value as ServiceStatus | '')
            }}
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="loading-row">Memuat data servis…</div>
        ) : services.length === 0 ? (
          <p className="empty-text">Belum ada data servis yang cocok.</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>No. Servis</th>
                  <th>Pelanggan</th>
                  <th>Kendaraan</th>
                  <th>Mekanik</th>
                  <th className="align-right">Total</th>
                  <th>Status</th>
                  <th>Pembayaran</th>
                  <th className="align-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {services.map((service) => (
                  <tr key={service.id}>
                    <td className="mono">{service.service_number}</td>
                    <td>
                      <strong>{service.customer_name}</strong>
                      {service.customer_phone && (
                        <span className="cell-sub">
                          {service.customer_phone}
                        </span>
                      )}
                    </td>
                    <td>
                      <span className="mono">{service.vehicle_plate}</span>
                      {service.vehicle_brand && (
                        <span className="cell-sub">
                          {service.vehicle_brand}
                        </span>
                      )}
                    </td>
                    <td>{service.mechanic_name ?? '-'}</td>
                    <td className="align-right">
                      {formatCurrency(service.total_cost)}
                    </td>
                    <td>
                      <StatusBadge
                        status={service.status}
                        label={serviceStatusLabels[service.status]}
                      />
                    </td>
                    <td>
                      <StatusBadge
                        status={service.payment_status}
                        label={paymentStatusLabels[service.payment_status]}
                      />
                    </td>
                    <td className="align-right">
                      <button
                        type="button"
                        className="button button-ghost button-small"
                        onClick={() => void openDetail(service)}
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

      {createOpen && (
        <Modal
          title="Servis Baru"
          subtitle="Masukkan data pelanggan dan keluhan kendaraan."
          onClose={() => setCreateOpen(false)}
        >
          <form className="form-grid" onSubmit={handleCreate}>
            {createError && (
              <div className="alert alert-error field-span">{createError}</div>
            )}

            <label className="field">
              <span>Nama pelanggan</span>
              <input
                className="input"
                required
                maxLength={100}
                value={createForm.customerName}
                onChange={(event) =>
                  setCreateForm((form) => ({
                    ...form,
                    customerName: event.target.value,
                  }))
                }
              />
            </label>

            <label className="field">
              <span>No. telepon</span>
              <input
                className="input"
                maxLength={30}
                placeholder="Opsional"
                value={createForm.customerPhone}
                onChange={(event) =>
                  setCreateForm((form) => ({
                    ...form,
                    customerPhone: event.target.value,
                  }))
                }
              />
            </label>

            <label className="field">
              <span>Nomor polisi</span>
              <input
                className="input"
                required
                maxLength={20}
                value={createForm.vehiclePlate}
                onChange={(event) =>
                  setCreateForm((form) => ({
                    ...form,
                    vehiclePlate: event.target.value,
                  }))
                }
              />
            </label>

            <label className="field">
              <span>Merek kendaraan</span>
              <input
                className="input"
                maxLength={100}
                placeholder="Opsional"
                value={createForm.vehicleBrand}
                onChange={(event) =>
                  setCreateForm((form) => ({
                    ...form,
                    vehicleBrand: event.target.value,
                  }))
                }
              />
            </label>

            <label className="field field-span">
              <span>Keluhan</span>
              <textarea
                className="input"
                required
                rows={3}
                value={createForm.complaint}
                onChange={(event) =>
                  setCreateForm((form) => ({
                    ...form,
                    complaint: event.target.value,
                  }))
                }
              />
            </label>

            <label className="field">
              <span>Mekanik</span>
              <input
                className="input"
                maxLength={100}
                placeholder="Opsional"
                value={createForm.mechanicName}
                onChange={(event) =>
                  setCreateForm((form) => ({
                    ...form,
                    mechanicName: event.target.value,
                  }))
                }
              />
            </label>

            <label className="field">
              <span>Catatan</span>
              <input
                className="input"
                placeholder="Opsional"
                value={createForm.notes}
                onChange={(event) =>
                  setCreateForm((form) => ({
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
                onClick={() => setCreateOpen(false)}
              >
                Batal
              </button>
              <button
                type="submit"
                className="button button-primary"
                disabled={savingCreate}
              >
                {savingCreate ? 'Menyimpan…' : 'Simpan Servis'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {detail && (
        <Modal
          title="Detail Servis"
          subtitle={detail.service_number}
          onClose={() => setDetail(null)}
          size="wide"
        >
          {detailLoading ? (
            <div className="loading-row">Memuat detail servis…</div>
          ) : (
            <>
              <dl className="detail-grid">
                <div>
                  <dt>Pelanggan</dt>
                  <dd>
                    {detail.customer_name}
                    {detail.customer_phone
                      ? ` · ${detail.customer_phone}`
                      : ''}
                  </dd>
                </div>
                <div>
                  <dt>Kendaraan</dt>
                  <dd>
                    {detail.vehicle_plate}
                    {detail.vehicle_brand
                      ? ` · ${detail.vehicle_brand}`
                      : ''}
                  </dd>
                </div>
                <div>
                  <dt>Status</dt>
                  <dd>
                    <StatusBadge
                      status={detail.status}
                      label={serviceStatusLabels[detail.status]}
                    />
                  </dd>
                </div>
                <div>
                  <dt>Pembayaran</dt>
                  <dd>
                    <StatusBadge
                      status={detail.payment_status}
                      label={paymentStatusLabels[detail.payment_status]}
                    />
                  </dd>
                </div>
                <div className="field-span">
                  <dt>Keluhan</dt>
                  <dd>{detail.complaint}</dd>
                </div>
                <div className="field-span">
                  <dt>Diagnosis</dt>
                  <dd>{detail.diagnosis ?? '-'}</dd>
                </div>
              </dl>

              <div className="section-heading">
                <h3>Spare Part</h3>
                <span>{formatCurrency(detail.parts_cost)}</span>
              </div>

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
                    {(detail.parts ?? []).length === 0 ? (
                      <tr>
                        <td colSpan={4} className="empty-text">
                          Belum ada spare part.
                        </td>
                      </tr>
                    ) : (
                      (detail.parts ?? []).map((part) => (
                        <tr key={part.id}>
                          <td>{part.product_name || `Produk #${part.product_id}`}</td>
                          <td className="align-right">
                            {formatNumber(part.quantity)}
                          </td>
                          <td className="align-right">
                            {formatCurrency(part.unit_price)}
                          </td>
                          <td className="align-right">
                            {formatCurrency(part.subtotal)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {editable && (
                <form className="inline-form" onSubmit={handleAddPart}>
                  {partError && (
                    <div className="alert alert-error field-span">
                      {partError}
                    </div>
                  )}

                  <select
                    className="input"
                    required
                    value={partProductId}
                    onChange={(event) => setPartProductId(event.target.value)}
                  >
                    <option value="">Pilih spare part…</option>
                    {products
                      .filter((product) => product.stock > 0)
                      .map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.name} · stok {product.stock}
                        </option>
                      ))}
                  </select>

                  <input
                    className="input input-compact"
                    type="number"
                    min="1"
                    step="1"
                    required
                    value={partQuantity}
                    onChange={(event) => setPartQuantity(event.target.value)}
                  />

                  <button
                    type="submit"
                    className="button button-primary"
                    disabled={savingPart}
                  >
                    {savingPart ? 'Menyimpan…' : 'Tambah Part'}
                  </button>
                </form>
              )}

              <div className="section-heading">
                <h3>Pembayaran</h3>
                <span>{formatCurrency(detail.total_cost)}</span>
              </div>

              {(detail.payments ?? []).length === 0 ? (
                <p className="empty-text">Belum ada pembayaran.</p>
              ) : (
                <ul className="payment-list">
                  {(detail.payments ?? []).map((payment) => (
                    <li key={payment.id}>
                      <div>
                        <strong>{formatCurrency(payment.amount)}</strong>
                        <span>
                          {formatDateTime(payment.paid_at)} ·{' '}
                          {payment.payment_method}
                        </span>
                      </div>
                      <span>{payment.notes ?? '-'}</span>
                    </li>
                  ))}
                </ul>
              )}

              {canPay && (
                <div className="payment-box">
                  {paymentError && (
                    <div className="alert alert-error">{paymentError}</div>
                  )}

                  <label className="field">
                    <span>Catatan pembayaran</span>
                    <input
                      className="input"
                      placeholder="Opsional"
                      value={paymentNotes}
                      onChange={(event) => setPaymentNotes(event.target.value)}
                    />
                  </label>

                  <button
                    type="button"
                    className="button button-primary"
                    disabled={savingPayment}
                    onClick={() => void handlePayment()}
                  >
                    {savingPayment
                      ? 'Memproses…'
                      : `Bayar ${formatCurrency(detail.total_cost)}`}
                  </button>
                </div>
              )}

              {editable && editForm && (
                <form className="form-grid form-section" onSubmit={handleUpdate}>
                  <div className="section-heading field-span">
                    <h3>Perbarui Servis</h3>
                  </div>

                  {editError && (
                    <div className="alert alert-error field-span">
                      {editError}
                    </div>
                  )}

                  <label className="field field-span">
                    <span>Diagnosis</span>
                    <textarea
                      className="input"
                      rows={2}
                      value={editForm.diagnosis}
                      onChange={(event) =>
                        setEditForm((form) =>
                          form
                            ? { ...form, diagnosis: event.target.value }
                            : form,
                        )
                      }
                    />
                  </label>

                  <label className="field">
                    <span>Mekanik</span>
                    <input
                      className="input"
                      maxLength={100}
                      value={editForm.mechanicName}
                      onChange={(event) =>
                        setEditForm((form) =>
                          form
                            ? { ...form, mechanicName: event.target.value }
                            : form,
                        )
                      }
                    />
                  </label>

                  <label className="field">
                    <span>Biaya jasa</span>
                    <input
                      className="input"
                      type="number"
                      min="0"
                      step="1"
                      value={editForm.laborCost}
                      onChange={(event) =>
                        setEditForm((form) =>
                          form
                            ? { ...form, laborCost: event.target.value }
                            : form,
                        )
                      }
                    />
                  </label>

                  <label className="field">
                    <span>Status servis</span>
                    <select
                      className="input"
                      value={editForm.status}
                      onChange={(event) =>
                        setEditForm((form) =>
                          form
                            ? {
                                ...form,
                                status: event.target.value as ServiceStatus,
                              }
                            : form,
                        )
                      }
                    >
                      <option value="pending">Menunggu</option>
                      <option value="in_progress">Dikerjakan</option>
                      <option value="completed">Selesai</option>
                      <option value="cancelled">Dibatalkan</option>
                    </select>
                  </label>

                  <label className="field">
                    <span>Catatan</span>
                    <input
                      className="input"
                      value={editForm.notes}
                      onChange={(event) =>
                        setEditForm((form) =>
                          form
                            ? { ...form, notes: event.target.value }
                            : form,
                        )
                      }
                    />
                  </label>

                  <div className="form-actions field-span">
                    <button
                      type="submit"
                      className="button button-primary"
                      disabled={savingEdit}
                    >
                      {savingEdit ? 'Menyimpan…' : 'Simpan Perubahan'}
                    </button>
                  </div>
                </form>
              )}

              <div className="detail-total">
                <span>Total biaya</span>
                <strong>{formatCurrency(detail.total_cost)}</strong>
              </div>
            </>
          )}
        </Modal>
      )}
    </section>
  )
}
