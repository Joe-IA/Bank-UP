import { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import { ArrowDown, ArrowUp } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { userApi, type TransactionWithAccounts } from '../api/user';
import type { DashboardOutletContext } from './DashboardLayout';
import './InicioPage.css';

// ── Utilities ─────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
  }).format(n);

function toUTC(s: string): Date {
  return new Date(s.replace(' ', 'T') + 'Z');
}

function greeting(name: string): string {
  const h = new Date().getHours();
  const g = h < 12 ? 'Buenos días' : h < 20 ? 'Buenas tardes' : 'Buenas noches';
  return `${g}, ${name.split(' ')[0]}.`;
}

function txDirection(tx: TransactionWithAccounts, myAcct: string): 'in' | 'out' {
  if (tx.type === 'deposit') return 'in';
  return tx.origin_account_number === myAcct ? 'out' : 'in';
}

function txLabel(tx: TransactionWithAccounts, myAcct: string): string {
  if (tx.description) return tx.description;
  if (tx.type === 'deposit') return 'Depósito';
  return txDirection(tx, myAcct) === 'out' ? 'Transferencia enviada' : 'Transferencia recibida';
}

function txOtherParty(tx: TransactionWithAccounts, myAcct: string): string {
  if (tx.type === 'deposit') return '';
  return tx.origin_account_number === myAcct
    ? (tx.destination_account_number ?? '—')
    : (tx.origin_account_number ?? '—');
}

// ── Deposit Modal ─────────────────────────────────────────────────────────────

interface DepositModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

function DepositModal({ onClose, onSuccess }: DepositModalProps) {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      setError('Ingresa un monto válido.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await userApi.deposit(amt, description || undefined);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Error al procesar el depósito.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="in-modal-overlay" onClick={onClose}>
      <div className="in-modal" onClick={(e) => e.stopPropagation()}>
        <p className="in-modal__eyebrow">OPERACIÓN · DEPÓSITO</p>
        <h2 className="in-modal__title">Depositar fondos</h2>
        <form onSubmit={handleSubmit}>
          <div className="in-modal__field">
            <label className="in-modal__label" htmlFor="dep-amount">
              Monto (MXN)
            </label>
            <input
              id="dep-amount"
              type="number"
              min="1"
              step="0.01"
              className="in-modal__input"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              autoFocus
            />
          </div>
          <div className="in-modal__field">
            <label className="in-modal__label" htmlFor="dep-desc">
              Concepto (opcional)
            </label>
            <input
              id="dep-desc"
              type="text"
              className="in-modal__input"
              placeholder="Ej. Nómina mayo"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          {error && <p className="in-modal__error">{error}</p>}
          <div className="in-modal__actions">
            <button type="button" className="in-btn in-btn--secondary" onClick={onClose}>
              Cancelar
            </button>
            <button
              type="submit"
              className="in-btn in-btn--primary"
              disabled={loading || !amount}
            >
              {loading ? 'Procesando...' : 'Depositar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function InicioPage() {
  const { profile, refreshProfile } = useOutletContext<DashboardOutletContext>();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<TransactionWithAccounts[]>([]);
  const [showDeposit, setShowDeposit] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    userApi
      .getTransactions()
      .then((r) => setTransactions(r.data.data))
      .catch(() => {});
  }, [refreshKey]);

  async function handleDepositSuccess() {
    await refreshProfile();
    setRefreshKey((k) => k + 1);
  }

  const myAcct = profile?.account_number ?? '';
  const recent = transactions.slice(0, 4);

  const now = new Date();
  const monthTxs = useMemo(
    () =>
      transactions.filter((tx) => {
        const d = toUTC(tx.created_at);
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
      }),
    [transactions]
  );

  const totalIn = monthTxs.reduce(
    (acc, tx) => (txDirection(tx, myAcct) === 'in' ? acc + tx.amount : acc),
    0
  );
  const totalOut = monthTxs.reduce(
    (acc, tx) => (txDirection(tx, myAcct) === 'out' ? acc + tx.amount : acc),
    0
  );

  // ── Chart data: last 30 days grouped by day ──────────────────────────────
  const chartData = useMemo(() => {
    const days: { label: string; ingresos: number; egresos: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setUTCDate(d.getUTCDate() - i);
      const label = d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', timeZone: 'UTC' });
      days.push({ label, ingresos: 0, egresos: 0 });
    }

    transactions.forEach((tx) => {
      const d = toUTC(tx.created_at);
      const diffDays = Math.floor((now.getTime() - d.getTime()) / 86_400_000);
      if (diffDays < 0 || diffDays >= 30) return;
      const idx = 29 - diffDays;
      const dir = txDirection(tx, myAcct);
      if (dir === 'in') days[idx].ingresos += tx.amount;
      else days[idx].egresos += tx.amount;
    });

    return days;
  }, [transactions, myAcct]);

  const dateLabel = now
    .toLocaleDateString('es-MX', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
    .toUpperCase();

  const monthLabel = now.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });

  const balanceParts =
    profile?.balance != null
      ? new Intl.NumberFormat('es-MX', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
          .format(profile.balance)
          .split('.')
      : null;

  return (
    <div className="in-page">
      {showDeposit && (
        <DepositModal
          onClose={() => setShowDeposit(false)}
          onSuccess={handleDepositSuccess}
        />
      )}

      {/* Header */}
      <div className="in-header">
        <div>
          <p className="in-header__date">{dateLabel}</p>
          <h1 className="in-header__greeting">
            {profile ? greeting(profile.name) : <span className="in-loading">Cargando…</span>}
          </h1>
        </div>
        <div className="in-header__actions">
          <button className="in-btn in-btn--secondary" onClick={() => setShowDeposit(true)}>
            Depositar
          </button>
          <button
            className="in-btn in-btn--primary"
            onClick={() => navigate('/dashboard/transferir')}
          >
            Transferir
          </button>
        </div>
      </div>

      {/* Balance card */}
      <div className="in-balance-card">
        <div>
          <p className="in-balance-card__label">SALDO DISPONIBLE</p>
          {balanceParts ? (
            <p className="in-balance-card__amount">
              ${balanceParts[0]}
              <span>.{balanceParts[1]}</span>
            </p>
          ) : (
            <p className="in-balance-card__amount">—</p>
          )}
          <div className="in-balance-card__meta">
            <div className="in-balance-card__meta-item">
              <span className="in-balance-card__meta-label">CUENTA</span>
              <span className="in-balance-card__meta-value">
                {profile?.account_number ?? '—'}
              </span>
            </div>
            <div className="in-balance-card__meta-item">
              <span className="in-balance-card__meta-label">TIPO</span>
              <span className="in-balance-card__meta-value">Cheques · MXN</span>
            </div>
            <div className="in-balance-card__meta-item">
              <span className="in-balance-card__meta-label">TOPE DE CUENTA</span>
              <span className="in-balance-card__meta-value">$1,000,000.00</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="in-quick-actions">
        <Link to="/dashboard/transferir" className="in-quick-card">
          <div className="in-quick-card__left">
            <span className="in-quick-card__title">Transferir</span>
            <span className="in-quick-card__sub">A otra cuenta Bank UP</span>
          </div>
          <span className="in-quick-card__arrow">›</span>
        </Link>
        <button className="in-quick-card" onClick={() => setShowDeposit(true)}>
          <div className="in-quick-card__left">
            <span className="in-quick-card__title">Depositar</span>
            <span className="in-quick-card__sub">Agregar fondos a tu cuenta</span>
          </div>
          <span className="in-quick-card__arrow">›</span>
        </button>
        <Link to="/dashboard/movimientos" className="in-quick-card">
          <div className="in-quick-card__left">
            <span className="in-quick-card__title">Movimientos</span>
            <span className="in-quick-card__sub">Bitácora completa</span>
          </div>
          <span className="in-quick-card__arrow">›</span>
        </Link>
        <Link to="/dashboard/perfil" className="in-quick-card">
          <div className="in-quick-card__left">
            <span className="in-quick-card__title">Mi perfil</span>
            <span className="in-quick-card__sub">Información de cuenta</span>
          </div>
          <span className="in-quick-card__arrow">›</span>
        </Link>
      </div>

      {/* Bottom row */}
      <div className="in-bottom">
        {/* Recent transactions */}
        <div className="in-recent">
          <div className="in-recent__header">
            <h2 className="in-recent__title">Movimientos recientes</h2>
            <Link to="/dashboard/movimientos" className="in-recent__link">
              Ver todos →
            </Link>
          </div>
          <p className="in-recent__sub">Últimos 4 movimientos de tu bitácora</p>

          {recent.length === 0 ? (
            <p className="in-empty">Sin movimientos registrados.</p>
          ) : (
            recent.map((tx) => {
              const dir = txDirection(tx, myAcct);
              const label = txLabel(tx, myAcct);
              const other = txOtherParty(tx, myAcct);
              const d = toUTC(tx.created_at);
              const dateStr = d.toLocaleDateString('es-MX', {
                day: 'numeric',
                month: 'short',
              });
              const timeStr = d.toLocaleTimeString('es-MX', {
                hour: '2-digit',
                minute: '2-digit',
              });
              const isIn = dir === 'in';

              return (
                <div key={tx.id} className="in-tx-row">
                  <div className={`in-tx-icon in-tx-icon--${dir}`}>
                    {isIn ? <ArrowDown size={15} /> : <ArrowUp size={15} />}
                  </div>
                  <div className="in-tx-info">
                    <p className="in-tx-name">{label}</p>
                    <p className="in-tx-meta">
                      {other ? `${other} · ` : ''}
                      {dateStr} {timeStr}
                    </p>
                  </div>
                  <div className="in-tx-right">
                    <p className={`in-tx-amount in-tx-amount--${dir}`}>
                      {isIn ? '+' : '-'}
                      {fmt(tx.amount)}
                    </p>
                    <span
                      className={`in-tx-badge ${
                        tx.type === 'deposit' || isIn
                          ? 'in-tx-badge--in'
                          : 'in-tx-badge--transfer'
                      }`}
                    >
                      {isIn ? 'Ingreso' : 'Transferencia'}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Month summary + charts */}
        <div className="in-summary">
          <h2 className="in-summary__title">Tu mes en cifras</h2>
          <p className="in-summary__period">Últimos 30 días</p>

          <div className="in-summary__totals">
            <div className="in-summary__col">
              <span className="in-summary__label">Ingresos</span>
              <span className="in-summary__value in-summary__value--in">+{fmt(totalIn)}</span>
            </div>
            <div className="in-summary__col in-summary__col--right">
              <span className="in-summary__label">Egresos</span>
              <span className="in-summary__value in-summary__value--out">-{fmt(totalOut)}</span>
            </div>
          </div>

          <div className="in-chart-block">
            <p className="in-chart-block__label">Ingresos</p>
            <ResponsiveContainer width="100%" height={80}>
              <AreaChart data={chartData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradIn" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#16A34A" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#16A34A" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="#F3F4F6" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9CA3AF' }} tickLine={false} axisLine={false} interval={6} />
                <YAxis hide />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E5E7EB' }}
                  formatter={(v: number) => [fmt(v), 'Ingresos']}
                  labelStyle={{ color: '#6B7280', marginBottom: 2 }}
                />
                <Area type="monotone" dataKey="ingresos" stroke="#16A34A" strokeWidth={2} fill="url(#gradIn)" dot={false} activeDot={{ r: 4 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="in-chart-block">
            <p className="in-chart-block__label">Egresos</p>
            <ResponsiveContainer width="100%" height={80}>
              <AreaChart data={chartData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradOut" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="#F3F4F6" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9CA3AF' }} tickLine={false} axisLine={false} interval={6} />
                <YAxis hide />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #E5E7EB' }}
                  formatter={(v: number) => [fmt(v), 'Egresos']}
                  labelStyle={{ color: '#6B7280', marginBottom: 2 }}
                />
                <Area type="monotone" dataKey="egresos" stroke="#2563EB" strokeWidth={2} fill="url(#gradOut)" dot={false} activeDot={{ r: 4 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
