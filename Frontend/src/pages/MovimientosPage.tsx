import { useState, useEffect, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Search } from 'lucide-react';
import { userApi, type TransactionWithAccounts } from '../api/user';
import type { DashboardOutletContext } from './DashboardLayout';
import './MovimientosPage.css';

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

type FilterType = 'all' | 'in' | 'out';

function txDirection(tx: TransactionWithAccounts, myAcct: string): 'in' | 'out' {
  if (tx.type === 'deposit') return 'in';
  return tx.origin_account_number === myAcct ? 'out' : 'in';
}

function txOtherParty(tx: TransactionWithAccounts, myAcct: string): string {
  if (tx.type === 'deposit') return '—';
  return tx.origin_account_number === myAcct
    ? (tx.destination_account_number ?? '—')
    : (tx.origin_account_number ?? '—');
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function MovimientosPage() {
  const { profile } = useOutletContext<DashboardOutletContext>();
  const [transactions, setTransactions] = useState<TransactionWithAccounts[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');

  const [search, setSearch] = useState('');

  useEffect(() => {
    userApi
      .getTransactions()
      .then((r) => setTransactions(r.data.data))
      .catch(() => {});
  }, []);

  const myAcct = profile?.account_number ?? '';
  const lastFour = myAcct ? myAcct.slice(-4) : '????';

  const filtered = useMemo(() => {
    let list = transactions;
    if (filter !== 'all') {
      list = list.filter((tx) => txDirection(tx, myAcct) === filter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (tx) =>
          tx.description?.toLowerCase().includes(q) ||
          tx.origin_account_number?.toLowerCase().includes(q) ||
          tx.destination_account_number?.toLowerCase().includes(q) ||
          `TX-${String(tx.id).padStart(6, '0')}`.toLowerCase().includes(q)
      );
    }
    return list;
  }, [transactions, filter, search]);

  const totalIn = transactions.reduce(
    (acc, tx) => (txDirection(tx, myAcct) === 'in' ? acc + tx.amount : acc),
    0
  );
  const totalOut = transactions.reduce(
    (acc, tx) => (txDirection(tx, myAcct) === 'out' ? acc + tx.amount : acc),
    0
  );

  const inCount = transactions.filter((tx) => txDirection(tx, myAcct) === 'in').length;
  const outCount = transactions.filter((tx) => txDirection(tx, myAcct) === 'out').length;

  return (
    <div className="mv-page">
      <div className="mv-header">
        <p className="mv-eyebrow">BITÁCORA · CUENTA •••• {lastFour}</p>
        <h1 className="mv-title">Movimientos</h1>
      </div>

      {/* Stats */}
      <div className="mv-stats">
        <div className="mv-stat">
          <p className="mv-stat__label">MOVIMIENTOS TOTALES</p>
          <p className="mv-stat__value">{transactions.length}</p>
          <p className="mv-stat__sub">Todos los registros</p>
        </div>
        <div className="mv-stat">
          <p className="mv-stat__label">TOTAL INGRESOS</p>
          <p className="mv-stat__value mv-stat__value--in">+{fmt(totalIn)}</p>
          <p className="mv-stat__sub">{inCount} movimientos</p>
        </div>
        <div className="mv-stat">
          <p className="mv-stat__label">TOTAL EGRESOS</p>
          <p className="mv-stat__value mv-stat__value--out">-{fmt(totalOut)}</p>
          <p className="mv-stat__sub">{outCount} movimientos</p>
        </div>
        <div className="mv-stat">
          <p className="mv-stat__label">SALDO ACTUAL</p>
          <p className="mv-stat__value">
            {profile?.balance != null ? fmt(profile.balance) : '—'}
          </p>
          <p className="mv-stat__sub">Saldo disponible</p>
        </div>
      </div>

      {/* Table + filters */}
      <div className="mv-filters">
        <div className="mv-filters__top">
          <div className="mv-search">
            <Search className="mv-search__icon" size={15} />
            <input
              type="text"
              className="mv-search__input"
              placeholder="Buscar por concepto, cuenta o ID…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="mv-filter-tabs">
            {(['all', 'in', 'out'] as FilterType[]).map((f) => (
              <button
                key={f}
                className={`mv-tab${filter === f ? ' mv-tab--active' : ''}`}
                onClick={() => setFilter(f)}
              >
                {f === 'all' ? 'Todos' : f === 'in' ? 'Ingresos' : 'Egresos'}
              </button>
            ))}
          </div>
          <span className="mv-count">
            {filtered.length} de {transactions.length} movimientos
          </span>
        </div>

        <table className="mv-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>CONCEPTO</th>
              <th>CUENTA INVOLUCRADA</th>
              <th>FECHA</th>
              <th>TIPO</th>
              <th className="mv-th--right">MONTO</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="mv-empty">
                  No hay movimientos con ese filtro.
                </td>
              </tr>
            ) : (
              filtered.map((tx) => {
                const dir = txDirection(tx, myAcct);
                const isIn = dir === 'in';
                const other = txOtherParty(tx, myAcct);
                const d = toUTC(tx.created_at);
                const dateStr = d.toLocaleDateString('es-MX', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                });
                const timeStr = d.toLocaleTimeString('es-MX', {
                  hour: '2-digit',
                  minute: '2-digit',
                });
                const label =
                  tx.description ||
                  (tx.type === 'deposit'
                    ? 'Depósito'
                    : isIn
                    ? 'Transferencia recibida'
                    : 'Transferencia enviada');

                return (
                  <tr key={tx.id}>
                    <td className="mv-td--id">
                      TX-{String(tx.id).padStart(6, '0')}
                    </td>
                    <td>
                      <p className="mv-td--concept">{label}</p>
                      <p className="mv-td--concept-sub">Procesado</p>
                    </td>
                    <td className="mv-td--account">{other}</td>
                    <td className="mv-td--date">
                      {dateStr}
                      <p className="mv-td--date-time">{timeStr}</p>
                    </td>
                    <td>
                      <span className={`mv-badge mv-badge--${isIn ? 'in' : 'out'}`}>
                        {isIn ? 'Ingreso' : 'Transferencia'}
                      </span>
                    </td>
                    <td className={`mv-td--amount mv-td--amount-${isIn ? 'in' : 'out'}`}>
                      {isIn ? '+' : '-'}
                      {fmt(tx.amount)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
