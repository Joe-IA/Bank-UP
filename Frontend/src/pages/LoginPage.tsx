import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, AlertTriangle } from 'lucide-react';
import { authApi } from '../api/auth';
import { useAuthStore } from '../store/authStore';
import './LoginPage.css';

const MAX_ATTEMPTS = 4;

// ── Logo ──────────────────────────────────────────────────────────────────────

function BankUpIcon() {
  return (
    <svg width="30" height="30" viewBox="0 0 30 30" fill="none" aria-hidden="true">
      <rect width="30" height="30" rx="7" fill="white" />
      <path
        d="M8.5 8.5v9a6.5 6.5 0 0 0 13 0v-9"
        stroke="#04132C"
        strokeWidth="2.6"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M21.5 24V11.5m0 0-3.5 3.5m3.5-3.5 3.5 3.5"
        stroke="#04132C"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Logo() {
  return (
    <div className="bu-logo">
      <BankUpIcon />
      <span className="bu-logo__text">
        Bank<strong>UP</strong>
      </span>
    </div>
  );
}

// ── Left Panel ────────────────────────────────────────────────────────────────

function LeftPanel() {
  return (
    <div className="lp-left">
      <div className="lp-left__header">
        <Logo />
      </div>
      <div className="lp-left__body">
        <h1 className="lp-left__headline">
          Una banca institucional,
          <br />
          <em>bien hecha.</em>
        </h1>
        <p className="lp-left__sub">
          Operaciones transaccionales sin comisiones, con cifrado de extremo a
          extremo y validación atómica de cada movimiento.
        </p>
      </div>
      <div className="lp-left__footer">
        <span>CNBV · IPAB</span>
        <span>TLS 1.3</span>
        <span>V 2026.1</span>
      </div>
    </div>
  );
}

// ── Right Nav ─────────────────────────────────────────────────────────────────

function RightNav() {
  return (
    <nav className="lp-nav">
      <span className="lp-nav__lang">
        Español <span>▾</span>
      </span>
      <a href="#" className="lp-nav__link">
        Ayuda
      </a>
      <a href="#" className="lp-nav__link">
        Privacidad
      </a>
    </nav>
  );
}

// ── Locked Screen (Screen 4) ──────────────────────────────────────────────────

function LockedScreen({ email }: { email: string }) {
  const [folio] = useState(() => {
    const now = new Date();
    const ymd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    return `INC-${ymd}-${String(Math.floor(Math.random() * 90000 + 10000))}`;
  });

  const lockTimestamp = new Date().toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }) + ' · ' + new Date().toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="lp-page">
      <LeftPanel />
      <div className="lp-right">
        <RightNav />
        <div className="lp-form-wrap">
          <p className="lp-eyebrow lp-eyebrow--error">CUENTA BLOQUEADA</p>
          <h2 className="lp-title">Acceso suspendido</h2>
          <p className="lp-subtitle">
            Tu cuenta fue bloqueada tras {MAX_ATTEMPTS} intentos fallidos
            consecutivos como medida de seguridad.
          </p>

          <div className="lp-locked-card">
            <div className="lp-locked-card__icon">
              <Lock size={17} />
            </div>
            <div>
              <p className="lp-locked-card__email">{email}</p>
              <p className="lp-locked-card__meta">Bloqueado · {lockTimestamp}</p>
            </div>
          </div>

          <div className="lp-locked-funds">
            <strong>Tus fondos están seguros.</strong> Tu cuenta puede continuar
            recibiendo transferencias entrantes mientras el acceso está suspendido.
          </div>

          <div className="lp-locked-actions">
            <button className="lp-btn lp-btn--primary" type="button">
              Solicitar reactivación al administrador
            </button>
            <button className="lp-btn lp-btn--secondary" type="button">
              Contactar a soporte 24/7
            </button>
          </div>

          <p className="lp-folio">Folio de incidencia · {folio}</p>
        </div>
        <footer className="lp-footer">
          © 2026 Bank UP · Institución de Banca Múltiple · Hecho en México
        </footer>
      </div>
    </div>
  );
}

// ── Main Login Page ───────────────────────────────────────────────────────────

export default function LoginPage() {
  const navigate = useNavigate();
  const { token, user, setAuth } = useAuthStore();

  const [view, setView] = useState<'form' | 'locked'>('form');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [failedAttempts, setFailedAttempts] = useState(0);

  useEffect(() => {
    if (token) {
      navigate(user?.role === 'admin' ? '/admin' : '/dashboard', { replace: true });
    }
  }, []);

  const hasFailures = failedAttempts > 0;
  const attemptsLeft = MAX_ATTEMPTS - failedAttempts;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await authApi.login(email, password);
      const { token: tk, user: u } = res.data.data;
      setAuth(u, tk);
      navigate(u.role === 'admin' ? '/admin' : '/dashboard', { replace: true });
    } catch (err: any) {
      const status = err?.response?.status;

      if (status === 403) {
        setView('locked');
      } else if (status === 401) {
        const next = failedAttempts + 1;
        setFailedAttempts(next);
        if (next >= MAX_ATTEMPTS) {
          setView('locked');
        } else {
          setError('La contraseña no coincide con nuestros registros.');
        }
      } else {
        setError('Ocurrió un error inesperado. Intenta de nuevo.');
      }
    } finally {
      setLoading(false);
    }
  }

  if (view === 'locked') {
    return <LockedScreen email={email} />;
  }

  const eyebrowText = hasFailures
    ? `INTENTO FALLIDO · ${failedAttempts} DE ${MAX_ATTEMPTS}`
    : 'ACCESO SEGURO';
  const titleText = hasFailures ? 'Credenciales no válidas' : 'Bienvenido de vuelta';
  const subtitleText = hasFailures
    ? `Verifica tu contraseña. Tras el ${MAX_ATTEMPTS}° intento fallido tu acceso será bloqueado.`
    : 'Ingresa con tu correo institucional para continuar.';

  return (
    <div className="lp-page">
      <LeftPanel />
      <div className="lp-right">
        <RightNav />
        <div className="lp-form-wrap">

          <p className={`lp-eyebrow ${hasFailures ? 'lp-eyebrow--warning' : ''}`}>
            {eyebrowText}
          </p>
          <h2 className="lp-title">{titleText}</h2>
          <p className="lp-subtitle">{subtitleText}</p>

          {hasFailures && attemptsLeft === 1 && (
            <div className="lp-alert-warning">
              <AlertTriangle size={16} />
              <p>
                <strong>Te queda 1 intento.</strong> Después, tu cuenta quedará
                bloqueada y solo un administrador podrá reactivarla.
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className="lp-field">
              <label className="lp-field__label" htmlFor="email">
                Correo electrónico
              </label>
              <input
                id="email"
                type="email"
                className="lp-field__input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="correo@up.edu.mx"
                autoComplete="email"
                required
              />
            </div>

            <div className="lp-field">
              <label className="lp-field__label" htmlFor="password">
                Contraseña
              </label>
              <div className={`lp-field__wrap ${error ? 'lp-field__wrap--error' : ''}`}>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  className="lp-field__input lp-field__input--icon"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="lp-field__eye"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
              {error && <p className="lp-field__error">{error}</p>}
            </div>

            {hasFailures && (
              <div className="lp-attempts">
                <span className="lp-attempts__label">Intentos restantes</span>
                <div className="lp-attempts__dots">
                  {Array.from({ length: MAX_ATTEMPTS }).map((_, i) => (
                    <span
                      key={i}
                      className={`lp-attempts__dot ${i < failedAttempts ? 'lp-attempts__dot--used' : ''}`}
                    />
                  ))}
                </div>
              </div>
            )}

            {!hasFailures && (
              <div className="lp-options">
                <label className="lp-checkbox">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <span>Mantener sesión activa</span>
                </label>
                <a href="#" className="lp-forgot">
                  ¿Olvidaste tu contraseña?
                </a>
              </div>
            )}

            <button
              type="submit"
              className="lp-btn lp-btn--primary"
              disabled={loading || !email || !password}
            >
              {loading ? 'Verificando...' : hasFailures ? 'Reintentar' : 'Iniciar sesión'}
            </button>

            {hasFailures && (
              <p className="lp-forgot-admin">
                ¿Olvidaste tu contraseña?{' '}
                <a href="#">Solicítala a tu administrador.</a>
              </p>
            )}
          </form>

          {!hasFailures && (
            <div className="lp-info-box">
              <Lock size={14} />
              <p>
                Esta es una banca de usuarios pre-cargados. El registro se realiza
                mediante tu institución; no se requiere alta pública.
              </p>
            </div>
          )}
        </div>

        <footer className="lp-footer">
          © 2026 Bank UP · Institución de Banca Múltiple · Hecho en México
        </footer>
      </div>
    </div>
  );
}
