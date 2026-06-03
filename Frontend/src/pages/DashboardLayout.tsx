import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { userApi } from '../api/user';
import type { UserProfile } from '../types';
import './DashboardLayout.css';

function initials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();
}

export interface DashboardOutletContext {
  profile: UserProfile | null;
  refreshProfile: () => Promise<void>;
}

export default function DashboardLayout() {
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);

  async function loadProfile() {
    try {
      const res = await userApi.getProfile();
      setProfile(res.data.data);
    } catch {
      // non-critical
    }
  }

  useEffect(() => {
    loadProfile();
  }, []);

  function logout() {
    clearAuth();
    navigate('/login', { replace: true });
  }

  const ctx: DashboardOutletContext = { profile, refreshProfile: loadProfile };

  return (
    <div className="db-layout">
      <header className="db-topbar">
        <div className="db-topbar__brand">
          <svg width="28" height="28" viewBox="0 0 30 30" fill="none" aria-hidden="true">
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
          <span className="db-topbar__wordmark">
            Bank<strong>UP</strong>
          </span>
        </div>

        <div className="db-topbar__right">
          {user && (
            <div className="db-topbar__user">
              <div className="db-topbar__avatar">{initials(user.name)}</div>
              <div className="db-topbar__info">
                <span className="db-topbar__name">{user.name}</span>
                <span className="db-topbar__account">
                  {profile?.account_number
                    ? `Cuenta · ${profile.account_number}`
                    : 'Cuenta de Cheques · MXN'}
                </span>
              </div>
            </div>
          )}
          <button className="db-topbar__logout" onClick={logout}>
            Cerrar sesión
          </button>
        </div>
      </header>

      <div className="db-body">
        <aside className="db-sidebar">
          <p className="db-sidebar__section">MENÚ PRINCIPAL</p>
          <nav className="db-sidebar__nav">
            <NavLink
              to="/dashboard"
              end
              className={({ isActive }) =>
                `db-nav__item${isActive ? ' db-nav__item--active' : ''}`
              }
            >
              Inicio
            </NavLink>
            <NavLink
              to="/dashboard/transferir"
              className={({ isActive }) =>
                `db-nav__item${isActive ? ' db-nav__item--active' : ''}`
              }
            >
              Transferir
            </NavLink>
            <NavLink
              to="/dashboard/movimientos"
              className={({ isActive }) =>
                `db-nav__item${isActive ? ' db-nav__item--active' : ''}`
              }
            >
              Movimientos
            </NavLink>
            <NavLink
              to="/dashboard/perfil"
              className={({ isActive }) =>
                `db-nav__item${isActive ? ' db-nav__item--active' : ''}`
              }
            >
              Perfil
            </NavLink>
          </nav>

          <div className="db-sidebar__bottom">
            <p className="db-sidebar__section">ASISTENCIA</p>
            <nav className="db-sidebar__nav">
              <a href="#" className="db-nav__item db-nav__item--muted">
                Soporte 24/7
              </a>
              <a href="#" className="db-nav__item db-nav__item--muted">
                Seguridad
              </a>
            </nav>
            <div className="db-session-box" style={{ marginTop: 12 }}>
              <span className="db-session-box__dot" />
              <div>
                <p className="db-session-box__title">SESIÓN SEGURA</p>
                <p className="db-session-box__sub">
                  Conectado vía TLS 1.3 · cifrado extremo a extremo.
                </p>
              </div>
            </div>
          </div>
        </aside>

        <main className="db-content">
          <Outlet context={ctx} />
        </main>
      </div>
    </div>
  );
}
