import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LogoMark from '../components/LogoMark';
import '../styles/login.css';

export default function LoginPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading, signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signIn(email.trim(), password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Login gagal. Silakan coba lagi.',
      );
    } finally {
      setLoading(false);
    }
  }

  if (authLoading) {
    return <div className="app-loading">Memeriksa sesi…</div>;
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <main className="login-shell">
      <section className="login-promo">
        <a className="brand" href="/login">
          <span className="brand-icon"><LogoMark /></span>
          <span>
            <strong>Bengkel<span>ku</span></strong>
            <small>Sistem Manajemen Bengkel</small>
          </span>
        </a>

        <div className="promo-content">
          <span className="eyebrow">BENGKEL MANAGEMENT SYSTEM</span>
          <h1>
            Kelola Bengkel Anda dengan <span>Lebih Mudah.</span>
          </h1>
          <p>
            Atur data produk, stok, penjualan, servis, dan pembelian
            dalam satu sistem yang terintegrasi.
          </p>

          <div className="feature-grid">
            <div className="feature-item">
              <span>◇</span>
              <strong>Manajemen Produk</strong>
            </div>
            <div className="feature-item">
              <span>▤</span>
              <strong>Stok Barang</strong>
            </div>
            <div className="feature-item">
              <span>↗</span>
              <strong>Penjualan</strong>
            </div>
            <div className="feature-item">
              <span>⚒</span>
              <strong>Layanan Servis</strong>
            </div>
          </div>
        </div>

        <div className="promo-bottom">
          <div className="garage-art" aria-hidden="true">
            <div className="garage-light" />
            <div className="garage-roof" />
            <div className="garage-window">
              <div />
              <div />
              <div />
            </div>
            <div className="tool-cabinet">
              <span />
              <span />
              <span />
            </div>
            <div className="car">
              <div className="car-window" />
              <div className="car-wheel wheel-left" />
              <div className="car-wheel wheel-right" />
              <div className="car-light" />
            </div>
            <div className="mechanic">
              <div className="mechanic-head" />
              <div className="mechanic-body" />
              <div className="mechanic-leg leg-left" />
              <div className="mechanic-leg leg-right" />
            </div>
            <div className="garage-floor" />
          </div>
          <p>Semua operasional bengkel, dalam satu tempat.</p>
        </div>
      </section>

      <section className="login-panel">
        <div className="login-card">
          <div className="mobile-brand">
            <span className="brand-icon"><LogoMark /></span>
            <strong>Bengkel<span>ku</span></strong>
          </div>

          <div className="login-heading">
            <div className="login-symbol"><LogoMark /></div>
            <h2>Selamat Datang</h2>
            <p>Masuk ke akun Anda untuk melanjutkan</p>
          </div>

          <form onSubmit={handleSubmit}>
            {error && (
              <div className="login-error" role="alert">
                {error}
              </div>
            )}

            <div className="field-group">
              <label htmlFor="email">Email</label>
              <div className="input-wrap">
                <span className="input-icon">✉</span>
                <input
                  id="email"
                  type="email"
                  placeholder="nama@email.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            <div className="field-group">
              <label htmlFor="password">Password</label>
              <div className="input-wrap">
                <span className="input-icon">♙</span>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Masukkan password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button
                  className="password-toggle"
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Sembunyikan password' : 'Lihat password'}
                >
                  {showPassword ? 'Sembunyikan' : 'Lihat'}
                </button>
              </div>
            </div>

            <div className="login-options">
              <label className="remember-option">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(event) => setRemember(event.target.checked)}
                />
                <span>Ingat saya</span>
              </label>
              <span className="forgot-placeholder">Akses akun</span>
            </div>

            <button className="login-submit" type="submit" disabled={loading}>
              {loading ? 'Memproses login...' : '→  Masuk ke Dashboard'}
            </button>
          </form>

          <p className="login-switch">
            Belum punya akun? <Link to="/register">Daftar di sini</Link>
          </p>

          <div className="login-footer">
            <span className="footer-dot" />
            Sistem manajemen bengkel terintegrasi
          </div>
        </div>

        <div className="panel-copyright">
          © 2026 Bengkelku · Sistem Manajemen Bengkel
        </div>
      </section>
    </main>
  );
}