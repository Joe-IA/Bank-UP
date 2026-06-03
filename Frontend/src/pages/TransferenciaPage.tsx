import { useState, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { AlertTriangle, Check, Lock } from 'lucide-react';
import { userApi, type TransactionWithAccounts } from '../api/user';
import type { Transaction } from '../types';
import type { DashboardOutletContext } from './DashboardLayout';
import './TransferenciaPage.css';

// ── Utilities ─────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
  }).format(n);

const DAILY_LIMIT = 50_000;

function toUTC(s: string): Date {
  return new Date(s.replace(' ', 'T') + 'Z');
}

function isTodayUTC(dateStr: string): boolean {
  const d = toUTC(dateStr);
  const now = new Date();
  return (
    d.getUTCFullYear() === now.getUTCFullYear() &&
    d.getUTCMonth() === now.getUTCMonth() &&
    d.getUTCDate() === now.getUTCDate()
  );
}

// ── Types ─────────────────────────────────────────────────────────────────────

type Step = 'form' | 'confirming' | 'success';

interface FormState {
  recipientName: string;
  accountNumber: string;
  concept: string;
  amount: string;
}

const EMPTY_FORM: FormState = {
  recipientName: '',
  accountNumber: '',
  concept: '',
  amount: '',
};

// ── Stepper ───────────────────────────────────────────────────────────────────

interface StepperProps {
  step: Step;
}

function Stepper({ step }: StepperProps) {
  const labels = ['Destinatario', 'Monto y concepto', 'Confirmación', 'Comprobante'];

  function circleState(i: number): 'done' | 'active' | 'pending' {
    if (step === 'form') {
      if (i <= 1) return 'active';
    } else if (step === 'confirming') {
      if (i <= 1) return 'done';
      if (i === 2) return 'active';
    } else {
      if (i <= 2) return 'done';
      if (i === 3) return 'active';
    }
    return 'pending';
  }

  return (
    <div className="tr-stepper">
      {labels.map((label, i) => {
        const state = circleState(i);
        return (
          <div key={label} className="tr-step-wrapper">
            {i > 0 && <div className="tr-step__connector" />}
            <div className="tr-step">
              <div className={`tr-step__circle tr-step__circle--${state}`}>
                {state === 'done' ? <Check size={13} /> : i + 1}
              </div>
              <span
                className={`tr-step__label ${
                  state !== 'pending' ? 'tr-step__label--active' : 'tr-step__label--pending'
                }`}
              >
                {label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function TransferenciaPage() {
  const { profile, refreshProfile } = useOutletContext<DashboardOutletContext>();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>('form');
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<Partial<FormState>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Transaction | null>(null);
  const [transactions, setTransactions] = useState<TransactionWithAccounts[]>([]);

  useEffect(() => {
    userApi.getTransactions().then((r) => setTransactions(r.data.data)).catch(() => {});
  }, []);

  const myAcct = profile?.account_number ?? '';
  const dailyUsed = transactions
    .filter(
      (tx) =>
        tx.type === 'transfer' &&
        tx.origin_account_number === myAcct &&
        isTodayUTC(tx.created_at)
    )
    .reduce((acc, tx) => acc + tx.amount, 0);
  const dailyRemaining = Math.max(0, DAILY_LIMIT - dailyUsed);
  const dailyPct = Math.min(100, (dailyUsed / DAILY_LIMIT) * 100);

  function setField(key: keyof FormState, val: string) {
    setForm((f) => ({ ...f, [key]: val }));
    setFieldErrors((e) => ({ ...e, [key]: '' }));
  }

  function validate(): boolean {
    const errs: Partial<FormState> = {};
    if (!form.recipientName.trim()) errs.recipientName = 'Ingresa el nombre del beneficiario.';
    if (!form.accountNumber.trim()) {
      errs.accountNumber = 'Ingresa el número de cuenta.';
    } else if (form.accountNumber.trim() === profile?.account_number) {
      errs.accountNumber = 'No puedes transferir a tu propia cuenta.';
    }
    if (!form.concept.trim()) errs.concept = 'Ingresa un concepto.';
    const amt = parseFloat(form.amount);
    if (!form.amount || isNaN(amt) || amt <= 0) {
      errs.amount = 'Ingresa un monto válido.';
    } else if (amt < 1) {
      errs.amount = 'El monto mínimo es $1.00.';
    } else if (profile?.balance != null && amt > profile.balance) {
      errs.amount = 'Saldo insuficiente para esta operación.';
    } else if (dailyUsed + amt > DAILY_LIMIT) {
      errs.amount = `Excede el límite diario. Disponible hoy: ${fmt(dailyRemaining)}.`;
    }
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function handleReview(e: React.FormEvent) {
    e.preventDefault();
    if (validate()) setStep('confirming');
  }

  async function handleConfirm() {
    setLoading(true);
    setError(null);
    try {
      const res = await userApi.transfer(
        form.accountNumber.trim(),
        parseFloat(form.amount),
        form.concept.trim()
      );
      setResult(res.data.data);
      await refreshProfile();
      setStep('success');
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ?? 'Error al procesar la transferencia.';
      setError(msg);
      setStep('form');
    } finally {
      setLoading(false);
    }
  }

  const amt = parseFloat(form.amount) || 0;
  const balanceAfter = (profile?.balance ?? 0) - amt;

  const nowStr = new Date().toLocaleDateString('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }) + ' · ' + new Date().toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="tr-page">
      <div className="tr-header">
        <p className="tr-eyebrow">OPERACIÓN · TRANSFERENCIA</p>
        <h1 className="tr-title">Nueva transferencia</h1>
      </div>

      {/* Account source card */}
      <div className="tr-account-card">
        <div>
          <p className="tr-account-card__label">DESDE</p>
          <p className="tr-account-card__name">Cuenta de Cheques · MXN</p>
          <p className="tr-account-card__number">{profile?.account_number ?? '—'}</p>
        </div>
        <div className="tr-account-card__divider" />
        <div className="tr-account-card__right">
          <p className="tr-account-card__balance-label">SALDO DISPONIBLE</p>
          <p className="tr-account-card__balance">
            {profile?.balance != null ? fmt(profile.balance) : '—'}
          </p>
        </div>
        <div className="tr-account-card__divider" />
        <div className="tr-account-card__daily">
          <p className="tr-account-card__label">LÍMITE DIARIO</p>
          <p className="tr-account-card__daily-remaining">{fmt(dailyRemaining)}</p>
          <p className="tr-account-card__daily-sub">
            {fmt(dailyUsed)} / {fmt(DAILY_LIMIT)} utilizados hoy
          </p>
          <div className="tr-daily-bar">
            <div
              className={`tr-daily-bar__fill${dailyPct >= 90 ? ' tr-daily-bar__fill--warn' : ''}`}
              style={{ width: `${dailyPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Stepper */}
      <Stepper step={step} />

      {/* ── SUCCESS ── */}
      {step === 'success' && result && (
        <div className="tr-comprobante">
          <div className="tr-comprobante__icon">
            <Check size={26} />
          </div>
          <h2 className="tr-comprobante__title">Transferencia enviada</h2>
          <p className="tr-comprobante__sub">
            Los fondos se acreditarán al beneficiario en segundos.
          </p>

          <div className="tr-comprobante__card">
            <div className="tr-comprobante__card-header">
              <div>
                <p className="tr-comprobante__card-label">COMPROBANTE</p>
                <p className="tr-comprobante__card-id">
                  TX-{String(result.id).padStart(6, '0')}
                </p>
              </div>
              <p className="tr-comprobante__card-amount">{fmt(result.amount)}</p>
            </div>

            <div className="tr-comprobante__grid">
              <div>
                <p className="tr-comprobante__field-label">DE</p>
                <p className="tr-comprobante__field-value">{profile?.account_number ?? '—'}</p>
              </div>
              <div>
                <p className="tr-comprobante__field-label">PARA</p>
                <p className="tr-comprobante__field-value">{form.accountNumber}</p>
              </div>
              <div>
                <p className="tr-comprobante__field-label">BENEFICIARIO</p>
                <p className="tr-comprobante__field-value">{form.recipientName}</p>
              </div>
              <div>
                <p className="tr-comprobante__field-label">CONCEPTO</p>
                <p className="tr-comprobante__field-value">{form.concept}</p>
              </div>
              <div>
                <p className="tr-comprobante__field-label">FECHA Y HORA</p>
                <p className="tr-comprobante__field-value">
                  {(() => {
                    const d = toUTC(result.created_at);
                    return (
                      d.toLocaleDateString('es-MX', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      }) +
                      ' · ' +
                      d.toLocaleTimeString('es-MX', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })
                    );
                  })()}
                </p>
              </div>
              <div>
                <p className="tr-comprobante__field-label">TIPO</p>
                <span className="tr-comprobante__badge">Transferencia</span>
              </div>
              <div>
                <p className="tr-comprobante__field-label">ESTATUS</p>
                <span className="tr-comprobante__status-badge">Procesado</span>
              </div>
              <div>
                <p className="tr-comprobante__field-label">FOLIO INTERNO</p>
                <p className="tr-comprobante__field-value">
                  DB#{String(result.id).padStart(7, '0')}
                </p>
              </div>
            </div>

            <div className="tr-comprobante__footer">
              <span className="tr-comprobante__footer-label">Saldo posterior</span>
              <span className="tr-comprobante__footer-value">
                {profile?.balance != null ? fmt(profile.balance) : '—'}
              </span>
            </div>
          </div>

          <div className="tr-comprobante__actions">
            <button
              className="tr-btn tr-btn--secondary"
              onClick={() => {
                setForm(EMPTY_FORM);
                setResult(null);
                setStep('form');
              }}
            >
              Nueva transferencia
            </button>
            <button
              className="tr-btn tr-btn--primary"
              onClick={() => navigate('/dashboard')}
            >
              Volver al inicio
            </button>
          </div>
        </div>
      )}

      {/* ── FORM ── */}
      {step !== 'success' && (
        <div className="tr-body">
          <div className="tr-form-card">
            {error && (
              <div className="tr-error-banner">
                <AlertTriangle size={16} color="#DC2626" />
                <p>{error}</p>
              </div>
            )}

            <form onSubmit={handleReview}>
              {/* Destinatario section */}
              <div className="tr-form-section">
                <h2 className="tr-form-section__title">Destinatario</h2>
                <p className="tr-form-section__sub">Ingresa los datos del beneficiario.</p>

                <div className="tr-field">
                  <label className="tr-field__label" htmlFor="tr-name">
                    Nombre del beneficiario
                  </label>
                  <input
                    id="tr-name"
                    type="text"
                    className={`tr-field__input${
                      fieldErrors.recipientName ? ' tr-field__input--error' : ''
                    }`}
                    placeholder="Nombre completo"
                    value={form.recipientName}
                    onChange={(e) => setField('recipientName', e.target.value)}
                  />
                  {fieldErrors.recipientName && (
                    <p className="tr-field__error">{fieldErrors.recipientName}</p>
                  )}
                </div>

                <div className="tr-field">
                  <label className="tr-field__label" htmlFor="tr-acct">
                    Número de cuenta
                  </label>
                  <input
                    id="tr-acct"
                    type="text"
                    className={`tr-field__input${
                      fieldErrors.accountNumber ? ' tr-field__input--error' : ''
                    }`}
                    placeholder="ACC-000000"
                    value={form.accountNumber}
                    onChange={(e) => setField('accountNumber', e.target.value)}
                  />
                  {fieldErrors.accountNumber ? (
                    <p className="tr-field__error">{fieldErrors.accountNumber}</p>
                  ) : (
                    <p className="tr-field__hint">
                      Formato: ACC-000000. Sirve indistintamente para cuenta o tarjeta.
                    </p>
                  )}
                </div>
              </div>

              {/* Monto y concepto section */}
              <div className="tr-form-section">
                <h2 className="tr-form-section__title">Monto y concepto</h2>

                <div className="tr-field">
                  <label className="tr-field__label" htmlFor="tr-concept">
                    Concepto
                  </label>
                  <input
                    id="tr-concept"
                    type="text"
                    className={`tr-field__input${
                      fieldErrors.concept ? ' tr-field__input--error' : ''
                    }`}
                    placeholder="Ej. Pago renta · mayo"
                    value={form.concept}
                    onChange={(e) => setField('concept', e.target.value)}
                  />
                  {fieldErrors.concept ? (
                    <p className="tr-field__error">{fieldErrors.concept}</p>
                  ) : (
                    <p className="tr-field__hint">
                      Aparecerá en tu bitácora y en la del receptor.
                    </p>
                  )}
                </div>

                <div className="tr-field">
                  <label className="tr-field__label">Monto</label>
                  <p className="tr-field__hint tr-field__hint--top">
                    Mínimo $1.00 · Sin comisiones.
                  </p>
                  <div
                    className={`tr-amount-card${
                      fieldErrors.amount ? ' tr-amount-card--error' : ''
                    }`}
                  >
                    <span className="tr-amount-card__prefix">$</span>
                    <input
                      type="number"
                      min="1"
                      step="0.01"
                      className={`tr-amount-card__input${
                        fieldErrors.amount ? ' tr-amount-card__input--error' : ''
                      }`}
                      placeholder="0"
                      value={form.amount}
                      onChange={(e) => setField('amount', e.target.value)}
                    />
                    <span className="tr-amount-card__currency">MXN</span>
                  </div>
                  {fieldErrors.amount ? (
                    <p className="tr-field__error">{fieldErrors.amount}</p>
                  ) : (
                    amt > 0 && (
                      <p className="tr-amount-hint">
                        Saldo después: {fmt(Math.max(0, balanceAfter))}
                      </p>
                    )
                  )}
                </div>
              </div>

              <div className="tr-form-submit">
                <button type="submit" className="tr-btn tr-btn--primary">
                  Revisar transferencia
                </button>
              </div>
            </form>
          </div>

          {/* Rules sidebar */}
          <div className="tr-rules-card">
            <p className="tr-rules-card__title">REGLAS DE OPERACIÓN</p>
            <div className="tr-rules-row">
              <span className="tr-rules-row__label">Monto mínimo</span>
              <span className="tr-rules-row__value">$1.00</span>
            </div>
            <div className="tr-rules-row">
              <span className="tr-rules-row__label">Máx. diario</span>
              <span className="tr-rules-row__value">{fmt(DAILY_LIMIT)}</span>
            </div>
            <div className="tr-rules-row">
              <span className="tr-rules-row__label">Disponible hoy</span>
              <span className={`tr-rules-row__value${dailyRemaining < DAILY_LIMIT * 0.1 ? ' tr-rules-row__value--warn' : ''}`}>
                {fmt(dailyRemaining)}
              </span>
            </div>
            <div className="tr-rules-row">
              <span className="tr-rules-row__label">Comisión</span>
              <span className="tr-rules-row__value">$0.00</span>
            </div>
            <div className="tr-rules-row">
              <span className="tr-rules-row__label">Tope por cuenta</span>
              <span className="tr-rules-row__value">$1,000,000.00</span>
            </div>

            <div className="tr-atomic-box">
              <p className="tr-atomic-box__title">
                <Lock size={12} /> VALIDACIÓN ATÓMICA
              </p>
              <p className="tr-atomic-box__body">
                Si la cuenta receptora alcanzara su tope al recibir esta transferencia,
                la operación se revertirá automáticamente para preservar la consistencia.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── CONFIRM MODAL ── */}
      {step === 'confirming' && (
        <div className="tr-modal-overlay" onClick={() => !loading && setStep('form')}>
          <div className="tr-modal" onClick={(e) => e.stopPropagation()}>
            <p className="tr-modal__eyebrow">CONFIRMAR TRANSFERENCIA</p>
            <h2 className="tr-modal__title">Revisa los detalles antes de continuar</h2>

            <div className="tr-modal__amount-card">
              <p className="tr-modal__amount-label">MONTO A TRANSFERIR</p>
              <p className="tr-modal__amount">{fmt(amt)}</p>
              <p className="tr-modal__amount-sub">MXN · sin comisión</p>
            </div>

            <div className="tr-modal__details">
              <div className="tr-modal__row">
                <span className="tr-modal__row-label">Beneficiario</span>
                <span className="tr-modal__row-value">{form.recipientName}</span>
              </div>
              <div className="tr-modal__row">
                <span className="tr-modal__row-label">Cuenta destino</span>
                <span className="tr-modal__row-value">{form.accountNumber}</span>
              </div>
              <div className="tr-modal__row">
                <span className="tr-modal__row-label">Concepto</span>
                <span className="tr-modal__row-value">{form.concept}</span>
              </div>
              <div className="tr-modal__row">
                <span className="tr-modal__row-label">Fecha</span>
                <span className="tr-modal__row-value">{nowStr}</span>
              </div>
              <div className="tr-modal__row">
                <span className="tr-modal__row-label">Saldo después</span>
                <span className="tr-modal__row-value">{fmt(Math.max(0, balanceAfter))}</span>
              </div>
            </div>

            <div className="tr-modal__warning">
              <AlertTriangle size={15} />
              <p>
                Esta operación es <strong>irreversible</strong>. Una vez confirmada, los fondos
                se acreditarán al beneficiario.
              </p>
            </div>

            <div className="tr-modal__actions">
              <button
                className="tr-btn tr-btn--secondary"
                onClick={() => setStep('form')}
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                className="tr-btn tr-btn--primary"
                onClick={handleConfirm}
                disabled={loading}
              >
                {loading ? 'Enviando…' : 'Confirmar y enviar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
