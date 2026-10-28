import { useEffect, useState, type FormEvent } from 'react'

import Modal from '../components/Modal'
import PageHeader from '../components/PageHeader'
import Pagination from '../components/Pagination'
import StatusBadge from '../components/StatusBadge'
import { useAuth } from '../context/AuthContext'
import {
  createUser,
  listUsers,
  updateUserRole,
} from '../services/users'
import type { AuthUser, Role } from '../types'
import { formatDate, roleLabels } from '../utils/format'

const PAGE_SIZE = 10

const roles: Role[] = ['owner', 'admin', 'mekanik', 'staff']

export default function UsersPage() {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState<AuthUser[]>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [savingId, setSavingId] = useState<number | null>(null)

  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'staff' as Role,
  })
  const [savingCreate, setSavingCreate] = useState(false)
  const [createError, setCreateError] = useState('')

  useEffect(() => {
    let active = true

    async function load() {
      setLoading(true)

      try {
        const result = await listUsers({ page, limit: PAGE_SIZE })

        if (active) {
          setUsers(result.data)
          setTotal(result.meta.total)
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error ? err.message : 'Gagal memuat pengguna',
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
  }, [page])

  async function handleRoleChange(user: AuthUser, role: Role) {
    if (role === user.role) return

    setSavingId(user.id)
    setError('')
    setNotice('')

    try {
      const result = await updateUserRole(user.id, role)

      setUsers((current) =>
        current.map((item) =>
          item.id === user.id ? result.data : item,
        ),
      )
      setNotice(`Role ${user.name} berhasil diubah menjadi ${roleLabels[role]}.`)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Gagal mengubah role pengguna',
      )
    } finally {
      setSavingId(null)
    }
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSavingCreate(true)
    setCreateError('')

    try {
      const result = await createUser({
        name: createForm.name.trim(),
        email: createForm.email.trim(),
        password: createForm.password,
        role: createForm.role,
      })

      setUsers((current) => [result.data, ...current])
      setTotal((value) => value + 1)
      setNotice(`Pengguna ${result.data.name} berhasil dibuat.`)
      setCreateOpen(false)
      setCreateForm({ name: '', email: '', password: '', role: 'staff' })
    } catch (err) {
      setCreateError(
        err instanceof Error ? err.message : 'Gagal membuat pengguna',
      )
    } finally {
      setSavingCreate(false)
    }
  }

  return (
    <section>
      <PageHeader
        title="Pengguna"
        description="Kelola role pengguna yang memiliki akses ke sistem."
        actions={
          <button
            type="button"
            className="button button-primary"
            onClick={() => {
              setCreateError('')
              setCreateForm({ name: '', email: '', password: '', role: 'staff' })
              setCreateOpen(true)
            }}
          >
            + Pengguna Baru
          </button>
        }
      />

      {error && <div className="alert alert-error">{error}</div>}
      {notice && <div className="alert alert-success">{notice}</div>}

      <article className="panel">
        {loading ? (
          <div className="loading-row">Memuat pengguna…</div>
        ) : users.length === 0 ? (
          <p className="empty-text">Belum ada pengguna.</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nama</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Terdaftar</th>
                  <th className="align-right">Ubah Role</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const isSelf = user.id === currentUser?.id

                  return (
                    <tr key={user.id}>
                      <td>
                        <strong>{user.name}</strong>
                        {isSelf && <span className="cell-sub">Akun Anda</span>}
                      </td>
                      <td>{user.email}</td>
                      <td>{roleLabels[user.role]}</td>
                      <td>
                        <StatusBadge
                          status={user.is_active ? 'completed' : 'cancelled'}
                          label={user.is_active ? 'Aktif' : 'Nonaktif'}
                        />
                      </td>
                      <td>{formatDate(user.created_at)}</td>
                      <td className="align-right">
                        <select
                          className="input input-compact"
                          value={user.role}
                          disabled={isSelf || savingId === user.id}
                          onChange={(event) =>
                            void handleRoleChange(
                              user,
                              event.target.value as Role,
                            )
                          }
                        >
                          {roles.map((role) => (
                            <option key={role} value={role}>
                              {roleLabels[role]}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  )
                })}
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
          title="Pengguna Baru"
          subtitle="Buat akun baru dan tentukan role-nya."
          onClose={() => setCreateOpen(false)}
        >
          <form className="form-grid" onSubmit={handleCreate}>
            {createError && (
              <div className="alert alert-error field-span">{createError}</div>
            )}

            <label className="field field-span">
              <span>Nama</span>
              <input
                className="input"
                required
                maxLength={100}
                value={createForm.name}
                onChange={(event) =>
                  setCreateForm((form) => ({
                    ...form,
                    name: event.target.value,
                  }))
                }
              />
            </label>

            <label className="field">
              <span>Email</span>
              <input
                className="input"
                type="email"
                required
                maxLength={255}
                value={createForm.email}
                onChange={(event) =>
                  setCreateForm((form) => ({
                    ...form,
                    email: event.target.value,
                  }))
                }
              />
            </label>

            <label className="field">
              <span>Role</span>
              <select
                className="input"
                value={createForm.role}
                onChange={(event) =>
                  setCreateForm((form) => ({
                    ...form,
                    role: event.target.value as Role,
                  }))
                }
              >
                <option value="owner">Owner</option>
                <option value="admin">Admin</option>
                <option value="mekanik">Mekanik</option>
                <option value="staff">Staff</option>
              </select>
            </label>

            <label className="field field-span">
              <span>Password</span>
              <input
                className="input"
                type="password"
                required
                minLength={8}
                maxLength={72}
                placeholder="Minimal 8 karakter"
                value={createForm.password}
                onChange={(event) =>
                  setCreateForm((form) => ({
                    ...form,
                    password: event.target.value,
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
                {savingCreate ? 'Menyimpan…' : 'Buat Pengguna'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </section>
  )
}
