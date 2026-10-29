import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'

import { useAuth } from '../context/AuthContext'
import LogoMark from '../components/LogoMark'
import type { Role } from '../types'
import { initials, roleLabels } from '../utils/format'

interface MenuItem {
  label: string
  path: string
  icon: string
  roles: Role[]
}

const menuItems: MenuItem[] = [
  {
    label: 'Dashboard',
    path: '/dashboard',
    icon: '⌂',
    roles: ['owner', 'admin', 'mekanik', 'staff'],
  },
  {
    label: 'Inventaris',
    path: '/inventory',
    icon: '▦',
    roles: ['owner', 'admin', 'mekanik', 'staff'],
  },
  {
    label: 'Penjualan',
    path: '/sales',
    icon: '↗',
    roles: ['owner', 'admin'],
  },
  {
    label: 'Servis Bengkel',
    path: '/services',
    icon: '⚙',
    roles: ['owner', 'admin', 'mekanik'],
  },
  {
    label: 'Pembelian',
    path: '/purchases',
    icon: '▤',
    roles: ['owner', 'admin'],
  },
  {
    label: 'Pengguna',
    path: '/users',
    icon: '☷',
    roles: ['owner'],
  },
]

function DashboardLayout() {
  const { user, signOut } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const visibleMenu = menuItems.filter(
    (item) => user && item.roles.includes(user.role),
  )

  return (
    <div className="dashboard-layout">
      {sidebarOpen && (
        <button
          type="button"
          className="sidebar-backdrop"
          aria-label="Tutup menu"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={sidebarOpen ? 'sidebar sidebar-open' : 'sidebar'}>
        <div className="sidebar-brand">
          <div className="brand-icon"><LogoMark /></div>
          <div>
            <strong>Bengkelku</strong>
            <span>Sistem Manajemen Bengkel</span>
          </div>
        </div>

        <p className="sidebar-heading">MENU UTAMA</p>

        <nav className="sidebar-nav">
          {visibleMenu.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `sidebar-link${isActive ? ' active' : ''}`
              }
            >
              <span className="sidebar-icon">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <span className="status-dot" />
          <span>Terhubung ke server</span>
          <small>Bengkelku v1.0</small>
        </div>
      </aside>

      <div className="dashboard-main">
        <header className="topbar">
          <div className="topbar-title">
            <button
              type="button"
              className="icon-button menu-toggle"
              onClick={() => setSidebarOpen((open) => !open)}
              aria-label="Buka menu"
            >
              ☰
            </button>
            <div>
              <strong>Manajemen Bengkel</strong>
              <p>Inventaris dan operasional bengkel motor</p>
            </div>
          </div>

          <div className="user-profile">
            <div className="user-avatar">
              {initials(user?.name ?? 'Pengguna')}
            </div>
            <div>
              <strong>{user?.name ?? 'Pengguna'}</strong>
              <span>{user ? roleLabels[user.role] : ''}</span>
            </div>
            <button
              type="button"
              className="button button-ghost button-small"
              onClick={signOut}
            >
              Keluar
            </button>
          </div>
        </header>

        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default DashboardLayout
