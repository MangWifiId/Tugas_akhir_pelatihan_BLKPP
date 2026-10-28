import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { register as registerRequest } from '../services/auth';
import '../styles/login.css';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading, signIn } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Konfirmasi password tidak sama.');
      return;
    }

    setLoading(true);

    try {
      await registerRequest(name.trim(), email.trim(), password);
      await signIn(email.trim(), password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Pendaftaran gagal. Silakan coba lagi.',
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
        <a className="brand" href="/">
          <span className="brand-icon">⚙</span>
          <span>
            <strong>Workshop<span>Pro</span></strong>
            <small>Sistem Manajemen Bengkel</small>
          </span>
        </a>

        <div className="promo-content">
          <span className="eyebrow">WORKSHOP MANAGEMENT SYSTEM</span>
          <h1>
            Gabung ke Sistem Bengkel <span>Anda.</span>
          </h1>
          <p>
            Buat akun baru untuk mulai mengelola produk, stok, penjualan,
            servis, dan pembelian dalam satu sistem terintegrasi.
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
            <span className="brand-icon">⚙</span>
            <strong>Workshop<span>Pro</span></strong>
          </div>

          <div className="login-heading">
            <div className="login-symbol">⚙</div>
            <h2>Buat Akun Baru</h2>
            <p>Daftar untuk mulai menggunakan sistem</p>
          </div>

          <form onSubmit={handleSubmit}>
            {error && (
              <div className="login-error" role="alert">
                {error}
              </div>
            )}

            <div className="field-group">
              <label htmlFor="name">Nama</label>
              <div className="input-wrap">
                <span className="input-icon">👤</span>
                <input
                  id="name"
                  type="text"
                  placeholder="Nama lengkap"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  autoComplete="name"
                  maxLength={100}
                  required
                />
              </div>
            </div>

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
                  autoComplete="email"
                  maxLength={255}
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
                  placeholder="Minimal 8 karakter"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={72}
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

            <div className="field-group">
              <label htmlFor="confirmPassword">Konfirmasi Password</label>
              <div className="input-wrap">
                <span className="input-icon">♙</span>
                <input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Ulangi password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  autoComplete="new-password"
                  required
                />
              </div>
            </div>

            <button className="login-submit" type="submit" disabled={loading}>
              {loading ? 'Memproses...' : '→  Daftar'}
            </button>
          </form>

          <p className="login-switch">
            Sudah punya akun? <Link to="/login">Masuk di sini</Link>
          </p>

          <div className="login-footer">
            <span className="footer-dot" />
            Sistem manajemen bengkel terintegrasi
          </div>
        </div>

        <div className="panel-copyright">
          © 2026 WorkshopPro · Sistem Manajemen Bengkel
        </div>
      </section>
    </main>
  );
}