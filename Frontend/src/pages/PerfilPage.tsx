import { useOutletContext } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import type { DashboardOutletContext } from './DashboardLayout';
import './PerfilPage.css';

function initials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();
}

export default function PerfilPage() {
  const { profile } = useOutletContext<DashboardOutletContext>();
  const { user } = useAuthStore();

  const name = profile?.name ?? user?.name ?? '—';
  const email = profile?.email ?? user?.email ?? '—';
  const accountNumber = profile?.account_number ?? '—';
  const balance = profile?.balance;
  const role = profile?.role ?? user?.role ?? 'user';
  const identifier = user?.id
    ? `UP-${new Date().getFullYear()}-${String(user.id).padStart(5, '0')}`
    : '—';

  const fmt = (n: number) =>
    new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 2,
    }).format(n);

  return (
    <div className="pf-page">
      <div className="pf-header">
        <p className="pf-eyebrow">CUENTA DEL USUARIO</p>
        <h1 className="pf-title">Mi perfil</h1>
      </div>

      <div className="pf-body">
        {/* Avatar card */}
        <div className="pf-card">
          <div className="pf-avatar-wrap">
            <div className="pf-avatar">{initials(name)}</div>
            <p className="pf-avatar-name">{name}</p>
            <p className="pf-avatar-email">{email}</p>
            <div className="pf-badges">
              <span className="pf-badge pf-badge--active">Cuenta activa</span>
              <span className="pf-badge pf-badge--role">
                {role === 'admin' ? 'Admin' : 'Usuario'}
              </span>
            </div>
          </div>

          <div className="pf-meta-list">
            <div className="pf-meta-row">
              <span className="pf-meta-row__label">Identificador</span>
              <span className="pf-meta-row__value">{identifier}</span>
            </div>
            <div className="pf-meta-row">
              <span className="pf-meta-row__label">Cuenta</span>
              <span className="pf-meta-row__value pf-meta-row__value--mono">
                {accountNumber}
              </span>
            </div>
            {balance != null && (
              <div className="pf-meta-row">
                <span className="pf-meta-row__label">Saldo</span>
                <span className="pf-meta-row__value">{fmt(balance)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right sections */}
        <div className="pf-right">
          {/* Información personal */}
          <div className="pf-section">
            <div className="pf-section__header">
              <div>
                <h2 className="pf-section__title">Información personal</h2>
                <p className="pf-section__sub">
                  Datos pre-cargados por tu institución. No editables en línea.
                </p>
              </div>
            </div>
            <div className="pf-grid">
              <div className="pf-field">
                <p className="pf-field__label">NOMBRE COMPLETO</p>
                <p className="pf-field__value">{name}</p>
              </div>
              <div className="pf-field">
                <p className="pf-field__label">CORREO ELECTRÓNICO</p>
                <p className="pf-field__value">{email}</p>
              </div>
              <div className="pf-field">
                <p className="pf-field__label">CUENTA PRINCIPAL</p>
                <p className="pf-field__value pf-field__value--mono">{accountNumber}</p>
              </div>
              <div className="pf-field">
                <p className="pf-field__label">TIPO DE CUENTA</p>
                <p className="pf-field__value">Cheques · MXN</p>
              </div>
              <div className="pf-field">
                <p className="pf-field__label">IDENTIFICADOR</p>
                <p className="pf-field__value">{identifier}</p>
              </div>
              <div className="pf-field">
                <p className="pf-field__label">ROL</p>
                <p className="pf-field__value">
                  {role === 'admin' ? 'Administrador' : 'Usuario'}
                </p>
              </div>
            </div>
          </div>

          {/* Seguridad */}
          <div className="pf-section">
            <div className="pf-section__header">
              <div>
                <h2 className="pf-section__title">Seguridad</h2>
                <p className="pf-section__sub">Contraseña y registro de acceso.</p>
              </div>
            </div>
            <div className="pf-security-row">
              <div>
                <p className="pf-security-row__title">Contraseña</p>
                <p className="pf-security-row__sub">
                  ••••••••  ·  Para cambiarla, contacta a tu administrador.
                </p>
              </div>
            </div>
            <div className="pf-security-row">
              <div>
                <p className="pf-security-row__title">Sesión actual</p>
                <p className="pf-security-row__sub">
                  Sesión activa en este dispositivo · TLS 1.3
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
