import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Unlock, Search, LogOut, ChevronDown, Users, BookOpen, Shield, AlertTriangle } from 'lucide-react';
import { adminApi, type AdminUser, type AdminAccount, type AdminLoginAttempt } from '../api/admin';
import { useAuthStore } from '../store/authStore';
import './AdminPage.css';

const MAX_ATTEMPTS = 4;
const HIGH_BALANCE = 800_000;

// ── Helpers ───────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  const parts = name.trim().split(' ');
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase();
}

const AVATAR_COLORS = [
  '#0F4C75', '#1B4332', '#4A1942', '#7C2D12',
  '#1E3A5F', '#065F46', '#3D1A78', '#92400E',
];

function avatarColor(id: number): string {
  return AVATAR_COLORS[id % AVATAR_COLORS.length];
}

function fmtBalance(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  return '$' + n.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtTotalBalance(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}K`;
  return '$' + n.toFixed(2);
}

function fmtSession(dateStr: string | null): string {
  if (!dateStr) return '—';
  // SQLite devuelve sin zona horaria — forzar UTC para conversión correcta a local
  const d = new Date(dateStr.replace(' ', 'T') + 'Z');
  const day = d.getDate();
  const month = d.toLocaleDateString('es-MX', { month: 'short' }).replace('.', '');
  const time = d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  return `${day} ${month} · ${time}`;
}

function isToday(dateStr: string): boolean {
  const d = new Date(dateStr.replace(' ', 'T') + 'Z');
  const now = new Date();
  return d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
}

function consecutiveFailures(attempts: AdminLoginAttempt[], userId: number): number {
  const sorted = attempts
    .filter(a => a.user_id === userId)
    .sort((a, b) => new Date(b.attempted_at.replace(' ', 'T') + 'Z').getTime() - new Date(a.attempted_at.replace(' ', 'T') + 'Z').getTime());
  let count = 0;
  for (const a of sorted) {
    if (a.success === 1) break;
    count++;
  }
  return count;
}

function lastSuccess(attempts: AdminLoginAttempt[], userId: number): string | null {
  const found = attempts
    .filter(a => a.user_id === userId && a.success === 1)
    .sort((a, b) => new Date(b.attempted_at.replace(' ', 'T') + 'Z').getTime() - new Date(a.attempted_at.replace(' ', 'T') + 'Z').getTime());
  return found[0]?.attempted_at ?? null;
}

// ── Merged user type ──────────────────────────────────────────────────────────

interface MergedUser extends AdminUser {
  account_number: string | null;
  balance: number | null;
  failed_attempts: number;
  last_session: string | null;
}

// ── Navbar ────────────────────────────────────────────────────────────────────

function AdminNavbar({ onLogout }: { onLogout: () => void }) {
  const { user } = useAuthStore();
  const initials = user ? getInitials(user.name) : 'A';

  return (
    <header className="ap-navbar">
      <div className="ap-navbar__logo">
        <svg width="26" height="26" viewBox="0 0 30 30" fill="none" aria-hidden="true">
          <rect width="30" height="30" rx="7" fill="white" />
          <path d="M8.5 8.5v9a6.5 6.5 0 0 0 13 0v-9" stroke="#04132C" strokeWidth="2.6" strokeLinecap="round" fill="none" />
          <path d="M21.5 24V11.5m0 0-3.5 3.5m3.5-3.5 3.5 3.5" stroke="#04132C" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="ap-navbar__brand">Bank<strong>UP</strong></span>
      </div>

      <div className="ap-navbar__right">
        <div className="ap-navbar__user">
          <div className="ap-navbar__avatar" style={{ background: avatarColor(user?.id ?? 1) }}>
            {initials}
          </div>
          <div className="ap-navbar__user-info">
            <span className="ap-navbar__user-name">{user?.name ?? 'Admin'}</span>
            <span className="ap-navbar__user-role">Administrador · Operaciones</span>
          </div>
          <ChevronDown size={15} className="ap-navbar__chevron" />
        </div>
        <button className="ap-navbar__logout" onClick={onLogout}>
          <LogOut size={14} />
          Cerrar sesión
        </button>
      </div>
    </header>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

type SidebarPage = 'users' | 'audit';

function AdminSidebar({ active, onChange }: { active: SidebarPage; onChange: (p: SidebarPage) => void }) {
  return (
    <aside className="ap-sidebar">
      <div className="ap-sidebar__section-label">PANEL ADMIN</div>
      <nav className="ap-sidebar__nav">
        <button
          className={`ap-sidebar__item ${active === 'users' ? 'ap-sidebar__item--active' : ''}`}
          onClick={() => onChange('users')}
        >
          <Users size={15} />
          Usuarios
        </button>
        <button
          className={`ap-sidebar__item ${active === 'audit' ? 'ap-sidebar__item--active' : ''}`}
          onClick={() => onChange('audit')}
        >
          <BookOpen size={15} />
          Auditoría
        </button>
      </nav>

      <div className="ap-sidebar__bottom">
        <div className="ap-sidebar__section-label" style={{ marginBottom: 6 }}>ASISTENCIA</div>
        <nav className="ap-sidebar__nav" style={{ marginBottom: 16 }}>
          <button className="ap-sidebar__item">Soporte 24/7</button>
          <button className="ap-sidebar__item">Seguridad</button>
        </nav>

      <div className="ap-sidebar__secure">
        <div className="ap-sidebar__secure-dot" />
        <div>
          <p className="ap-sidebar__secure-label">SESIÓN SEGURA</p>
          <p className="ap-sidebar__secure-text">Conectado via TLS 1.3 · cifrado extremo a extremo.</p>
        </div>
      </div>
      </div>
    </aside>
  );
}

// ── Stats Cards ───────────────────────────────────────────────────────────────

function StatsCard({ label, value, sub, accent }: {
  label: string; value: string; sub: string; accent?: boolean;
}) {
  return (
    <div className="ap-stat">
      <p className="ap-stat__label">{label}</p>
      <p className={`ap-stat__value ${accent ? 'ap-stat__value--accent' : ''}`}>{value}</p>
      <p className="ap-stat__sub">{sub}</p>
    </div>
  );
}

// ── Lock Modal ────────────────────────────────────────────────────────────────

function LockModal({ user, onConfirm, onCancel, loading }: {
  user: MergedUser;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const initials = getInitials(user.name);

  return (
    <div className="ap-modal-overlay" onClick={onCancel}>
      <div className="ap-modal" onClick={e => e.stopPropagation()}>
        <div className="ap-modal__header">
          <div className="ap-modal__lock-icon">
            <Lock size={20} />
          </div>
          <div>
            <p className="ap-modal__eyebrow">ACCIÓN ADMINISTRATIVA</p>
            <h3 className="ap-modal__title">Bloquear acceso del usuario</h3>
          </div>
        </div>

        <div className="ap-modal__user-card">
          <div className="ap-modal__avatar" style={{ background: avatarColor(user.id) }}>
            {initials}
          </div>
          <div>
            <p className="ap-modal__user-name">{user.name}</p>
            <p className="ap-modal__user-meta">{user.email} · {user.account_number ?? '—'}</p>
          </div>
          <span className="ap-badge ap-badge--active">● Activo</span>
        </div>

        <div className="ap-modal__warning">
          <AlertTriangle size={15} />
          <p>
            <strong>Importante.</strong> El bloqueo impide el ingreso del usuario a la plataforma,
            pero <strong>su cuenta bancaria continuará recibiendo transferencias entrantes</strong>.
            La reactivación es potestad exclusiva de tu rol.
          </p>
        </div>

        <div className="ap-modal__actions">
          <button className="ap-modal__cancel" onClick={onCancel} disabled={loading}>
            Cancelar
          </button>
          <button
            className="ap-modal__lock-btn"
            onClick={() => onConfirm()}
            disabled={loading}
          >
            {loading ? 'Bloqueando...' : 'Bloquear usuario'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Unlock Modal ──────────────────────────────────────────────────────────────

function UnlockModal({ user, onConfirm, onCancel, loading }: {
  user: MergedUser;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const initials = getInitials(user.name);

  return (
    <div className="ap-modal-overlay" onClick={onCancel}>
      <div className="ap-modal" onClick={e => e.stopPropagation()}>
        <div className="ap-modal__header">
          <div className="ap-modal__lock-icon ap-modal__lock-icon--unlock">
            <Unlock size={20} />
          </div>
          <div>
            <p className="ap-modal__eyebrow ap-modal__eyebrow--unlock">ACCIÓN ADMINISTRATIVA</p>
            <h3 className="ap-modal__title">Desbloquear acceso del usuario</h3>
          </div>
        </div>

        <div className="ap-modal__user-card">
          <div className="ap-modal__avatar" style={{ background: avatarColor(user.id) }}>
            {initials}
          </div>
          <div>
            <p className="ap-modal__user-name">{user.name}</p>
            <p className="ap-modal__user-meta">{user.email} · {user.account_number ?? '—'}</p>
          </div>
          <span className="ap-badge ap-badge--blocked">● Bloqueado</span>
        </div>

        <div className="ap-modal__actions">
          <button className="ap-modal__cancel" onClick={onCancel} disabled={loading}>
            Cancelar
          </button>
          <button
            className="ap-modal__unlock-btn"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Desbloqueando...' : 'Desbloquear usuario'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── User Row ──────────────────────────────────────────────────────────────────

function UserRow({ user, onAction }: {
  user: MergedUser;
  onAction: (user: MergedUser, action: 'lock' | 'unlock') => void;
}) {
  const initials = getInitials(user.name);
  const isLocked = user.is_locked === 1;
  const nearLimit = (user.balance ?? 0) > HIGH_BALANCE;

  return (
    <tr className="ap-table__row">
      <td className="ap-table__cell">
        <div className="ap-user-cell">
          <div className="ap-user-cell__avatar" style={{ background: avatarColor(user.id) }}>
            {initials}
          </div>
          <div>
            <p className="ap-user-cell__name">{user.name}</p>
            <p className="ap-user-cell__email">{user.email}</p>
          </div>
        </div>
      </td>

      <td className="ap-table__cell">
        <p className="ap-account__number">{user.account_number ?? '—'}</p>
      </td>

      <td className="ap-table__cell">
        <div className="ap-balance-cell">
          <span className={`ap-balance-cell__amount ${nearLimit ? 'ap-balance-cell__amount--warn' : ''}`}>
            {user.balance !== null ? fmtBalance(user.balance) : '—'}
          </span>
          <span className="ap-balance-cell__attempts">
            {user.failed_attempts}/{MAX_ATTEMPTS}
          </span>
        </div>
        {nearLimit && <p className="ap-balance-cell__tope">cerca del tope</p>}
      </td>

      <td className="ap-table__cell ap-table__cell--muted">
        {fmtSession(user.last_session)}
      </td>

      <td className="ap-table__cell">
        <div className="ap-status-cell">
          <span className={`ap-badge ${isLocked ? 'ap-badge--blocked' : 'ap-badge--active'}`}>
            ● {isLocked ? 'Bloqueado' : 'Activo'}
          </span>
          <button
            className={`ap-action-btn ${isLocked ? 'ap-action-btn--unlock' : 'ap-action-btn--lock'}`}
            onClick={() => onAction(user, isLocked ? 'unlock' : 'lock')}
            title={isLocked ? 'Desbloquear' : 'Bloquear'}
          >
            {isLocked ? <Unlock size={14} /> : <Lock size={14} />}
          </button>
        </div>
      </td>
    </tr>
  );
}

// ── Audit Panel ──────────────────────────────────────────────────────────────

function AuditPanel({ attempts, loading }: { attempts: AdminLoginAttempt[]; loading: boolean }) {
  const [filter, setFilter] = useState<'all' | 'success' | 'fail'>('all');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    return attempts
      .filter(a => {
        if (filter === 'success') return a.success === 1;
        if (filter === 'fail') return a.success === 0;
        return true;
      })
      .filter(a => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (
          a.email.toLowerCase().includes(q) ||
          (a.user_name?.toLowerCase().includes(q) ?? false) ||
          (a.ip_address?.includes(q) ?? false)
        );
      });
  }, [attempts, filter, search]);

  const totalCount   = attempts.length;
  const successCount = attempts.filter(a => a.success === 1).length;
  const failCount    = attempts.filter(a => a.success === 0).length;
  const uniqueIPs    = new Set(attempts.map(a => a.ip_address).filter(Boolean)).size;

  return (
    <>
      <div className="ap-page-header">
        <div>
          <p className="ap-eyebrow">SUPERVISIÓN · AUDITORÍA</p>
          <h1 className="ap-title">Bitácora de accesos</h1>
          <p className="ap-subtitle">
            Registro de los últimos 200 intentos de inicio de sesión en el sistema.
          </p>
        </div>
      </div>

      <div className="ap-stats">
        <StatsCard label="TOTAL INTENTOS"  value={String(totalCount)}   sub="últimos 200 registros" />
        <StatsCard label="EXITOSOS"        value={String(successCount)} sub={`${totalCount > 0 ? ((successCount / totalCount) * 100).toFixed(1) : 0}% del total`} />
        <StatsCard label="FALLIDOS"        value={String(failCount)}    sub="credenciales inválidas" accent={failCount > 0} />
        <StatsCard label="IPs ÚNICAS"      value={String(uniqueIPs)}    sub="direcciones distintas" />
      </div>

      <div className="ap-filter-bar">
        <div className="ap-search">
          <Search size={15} className="ap-search__icon" />
          <input
            className="ap-search__input"
            placeholder="Buscar por correo, nombre o IP..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="ap-filter-tabs">
          <button className={`ap-filter-tab ${filter === 'all'     ? 'ap-filter-tab--active' : ''}`} onClick={() => setFilter('all')}>
            Todos <span className="ap-filter-tab__count">{totalCount}</span>
          </button>
          <button className={`ap-filter-tab ${filter === 'success' ? 'ap-filter-tab--active' : ''}`} onClick={() => setFilter('success')}>
            Exitosos <span className="ap-filter-tab__count">{successCount}</span>
          </button>
          <button className={`ap-filter-tab ${filter === 'fail'    ? 'ap-filter-tab--active' : ''}`} onClick={() => setFilter('fail')}>
            Fallidos <span className="ap-filter-tab__count">{failCount}</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="ap-loading">Cargando bitácora...</div>
      ) : (
        <div className="ap-table-wrap">
          <table className="ap-table">
            <thead>
              <tr>
                <th className="ap-table__th">USUARIO</th>
                <th className="ap-table__th">FECHA / HORA</th>
                <th className="ap-table__th">RESULTADO</th>
                <th className="ap-table__th">IP</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(a => (
                <tr key={a.id} className="ap-table__row">
                  <td className="ap-table__cell">
                    <p className="ap-user-cell__name">{a.user_name ?? '—'}</p>
                    <p className="ap-user-cell__email">{a.email}</p>
                  </td>
                  <td className="ap-table__cell ap-table__cell--muted">
                    {fmtSession(a.attempted_at)}
                  </td>
                  <td className="ap-table__cell">
                    <span className={`ap-badge ${a.success === 1 ? 'ap-badge--active' : 'ap-badge--blocked'}`}>
                      ● {a.success === 1 ? 'Exitoso' : 'Fallido'}
                    </span>
                  </td>
                  <td className="ap-table__cell ap-table__cell--muted ap-table__cell--mono">
                    {a.ip_address ?? '—'}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="ap-table__empty">
                    No se encontraron registros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const navigate = useNavigate();
  const { clearAuth } = useAuthStore();

  const [sidebarPage, setSidebarPage] = useState<SidebarPage>('users');
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [accounts, setAccounts] = useState<AdminAccount[]>([]);
  const [attempts, setAttempts] = useState<AdminLoginAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'blocked'>('all');
  const [modal, setModal] = useState<{ user: MergedUser; action: 'lock' | 'unlock' } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [usersRes, accountsRes, attemptsRes] = await Promise.all([
          adminApi.getUsers(),
          adminApi.getAccounts(),
          adminApi.getLoginAttempts(),
        ]);
        setUsers(usersRes.data.data);
        setAccounts(accountsRes.data.data);
        setAttempts(attemptsRes.data.data);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const mergedUsers = useMemo<MergedUser[]>(() => {
    return users.map(u => {
      const account = accounts.find(a => a.user_id === u.id);
      return {
        ...u,
        account_number: account?.account_number ?? null,
        balance: account?.balance ?? null,
        failed_attempts: consecutiveFailures(attempts, u.id),
        last_session: lastSuccess(attempts, u.id),
      };
    });
  }, [users, accounts, attempts]);

  const stats = useMemo(() => {
    const total = users.length;
    const blocked = users.filter(u => u.is_locked === 1).length;
    const activeToday = new Set(
      attempts.filter(a => a.success === 1 && isToday(a.attempted_at)).map(a => a.user_id)
    ).size;
    const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0);
    const pct = total > 0 ? ((activeToday / total) * 100).toFixed(1) : '0';
    return { total, blocked, activeToday, totalBalance, pct };
  }, [users, accounts, attempts]);

  const filteredUsers = useMemo(() => {
    return mergedUsers
      .filter(u => u.role !== 'admin')
      .filter(u => {
        if (filter === 'active') return u.is_locked === 0;
        if (filter === 'blocked') return u.is_locked === 1;
        return true;
      })
      .filter(u => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (
          u.name.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          (u.account_number?.toLowerCase().includes(q) ?? false)
        );
      });
  }, [mergedUsers, filter, search]);

  function handleLogout() {
    clearAuth();
    navigate('/login', { replace: true });
  }

  async function handleAction(user: MergedUser, action: 'lock' | 'unlock') {
    setModal({ user, action });
  }

  async function confirmAction(reason?: string) {
    if (!modal) return;
    setActionLoading(true);
    try {
      if (modal.action === 'lock') {
        await adminApi.lockUser(modal.user.id);
      } else {
        await adminApi.unlockUser(modal.user.id);
      }
      setUsers(prev =>
        prev.map(u =>
          u.id === modal.user.id
            ? { ...u, is_locked: modal.action === 'lock' ? 1 : 0 }
            : u
        )
      );
      setModal(null);
    } finally {
      setActionLoading(false);
    }
  }

  const activeCount = mergedUsers.filter(u => u.role !== 'admin' && u.is_locked === 0).length;
  const blockedCount = mergedUsers.filter(u => u.role !== 'admin' && u.is_locked === 1).length;
  const totalCount = mergedUsers.filter(u => u.role !== 'admin').length;

  return (
    <div className="ap-layout">
      <AdminNavbar onLogout={handleLogout} />
      <div className="ap-body">
        <AdminSidebar active={sidebarPage} onChange={setSidebarPage} />

        <main className="ap-main">
          {sidebarPage === 'users' && (
            <>
              <div className="ap-page-header">
                <div>
                  <p className="ap-eyebrow">SUPERVISIÓN · PADRÓN DE USUARIOS</p>
                  <h1 className="ap-title">Usuarios del sistema</h1>
                  <p className="ap-subtitle">
                    Rol interno · sin facultades transaccionales. Solo bloqueo / desbloqueo de acceso.
                  </p>
                </div>
              </div>

              <div className="ap-stats">
                <StatsCard label="USUARIOS TOTALES" value={String(stats.total)} sub="padrón pre-cargado" />
                <StatsCard label="SESIONES ACTIVAS (HOY)" value={String(stats.activeToday)} sub={`${stats.pct}% del padrón`} />
                <StatsCard label="CUENTAS BLOQUEADAS" value={String(stats.blocked)} sub={`${stats.blocked} intentos fallidos`} accent={stats.blocked > 0} />
                <StatsCard label="SALDO AGREGADO EN SISTEMA" value={fmtTotalBalance(stats.totalBalance)} sub={`${totalCount} cuentas · MXN`} />
              </div>

              <div className="ap-filter-bar">
                <div className="ap-search">
                  <Search size={15} className="ap-search__icon" />
                  <input
                    className="ap-search__input"
                    placeholder="Buscar por nombre, correo o número de cuenta."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                </div>
                <div className="ap-filter-tabs">
                  <button className={`ap-filter-tab ${filter === 'all' ? 'ap-filter-tab--active' : ''}`} onClick={() => setFilter('all')}>
                    Todos <span className="ap-filter-tab__count">{totalCount}</span>
                  </button>
                  <button className={`ap-filter-tab ${filter === 'active' ? 'ap-filter-tab--active' : ''}`} onClick={() => setFilter('active')}>
                    Activos <span className="ap-filter-tab__count">{activeCount}</span>
                  </button>
                  <button className={`ap-filter-tab ${filter === 'blocked' ? 'ap-filter-tab--active' : ''}`} onClick={() => setFilter('blocked')}>
                    Bloqueados <span className="ap-filter-tab__count">{blockedCount}</span>
                  </button>
                </div>
              </div>

              {loading ? (
                <div className="ap-loading">Cargando usuarios...</div>
              ) : (
                <div className="ap-table-wrap">
                  <table className="ap-table">
                    <thead>
                      <tr>
                        <th className="ap-table__th">USUARIO</th>
                        <th className="ap-table__th">CUENTA</th>
                        <th className="ap-table__th">SALDO / INTENTOS</th>
                        <th className="ap-table__th">ÚLTIMA SESIÓN</th>
                        <th className="ap-table__th">ESTADO</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map(u => (
                        <UserRow key={u.id} user={u} onAction={handleAction} />
                      ))}
                      {filteredUsers.length === 0 && (
                        <tr>
                          <td colSpan={5} className="ap-table__empty">
                            No se encontraron usuarios.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {sidebarPage === 'audit' && (
            <AuditPanel attempts={attempts} loading={loading} />
          )}
        </main>
      </div>

      {modal?.action === 'lock' && (
        <LockModal
          user={modal.user}
          onConfirm={confirmAction}
          onCancel={() => setModal(null)}
          loading={actionLoading}
        />
      )}
      {modal?.action === 'unlock' && (
        <UnlockModal
          user={modal.user}
          onConfirm={confirmAction}
          onCancel={() => setModal(null)}
          loading={actionLoading}
        />
      )}
    </div>
  );
}
