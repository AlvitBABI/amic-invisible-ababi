import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Globe, X } from 'lucide-react';
import { useI18n } from '../i18n.js';

// ---------------------------------------------------------------------------
// Toasts
// ---------------------------------------------------------------------------
const ToastContext = createContext(() => {});

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id) => setToasts((ts) => ts.filter((x) => x.id !== id)), []);

  const toast = useCallback((message, type = 'success') => {
    const id = ++nextId.current;
    setToasts((ts) => [...ts, { id, message, type }]);
    setTimeout(() => dismiss(id), type === 'error' ? 6000 : 3500);
  }, [dismiss]);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="fixed bottom-4 inset-x-0 z-[60] flex flex-col items-center gap-2 px-4 pointer-events-none" aria-live="polite">
        {toasts.map((x) => (
          <div
            key={x.id}
            role={x.type === 'error' ? 'alert' : 'status'}
            className={`pointer-events-auto max-w-md w-full flex items-start gap-2 px-4 py-3 rounded-2xl shadow-2xl border text-xs ${
              x.type === 'error'
                ? 'bg-[#521E25] border-[#C95757]/60 text-[#FFD0CC]'
                : 'bg-[#123D29] border-[#4BAE72]/60 text-[#D7F2DE]'
            }`}
          >
            {x.type === 'error' ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
            <span className="flex-1">{x.message}</span>
            <button onClick={() => dismiss(x.id)} className="opacity-70 hover:opacity-100"><X className="w-3.5 h-3.5" /></button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

// ---------------------------------------------------------------------------
// Confirm modal: `await confirm({ title, body, danger })` -> boolean
// ---------------------------------------------------------------------------
const ConfirmContext = createContext(async () => false);

export function ConfirmProvider({ children }) {
  const { t } = useI18n();
  const [state, setState] = useState(null);
  const confirmBtn = useRef(null);

  const confirm = useCallback((opts) => new Promise((resolve) => setState({ ...opts, resolve })), []);

  const close = (result) => {
    state?.resolve(result);
    setState(null);
  };

  useEffect(() => {
    if (!state) return undefined;
    confirmBtn.current?.focus();
    const onKey = (e) => { if (e.key === 'Escape') close(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state && (
        <div className="fixed inset-0 z-[70] bg-black/60 flex items-center justify-center p-4" onClick={() => close(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            className="bg-[#102B20] border border-[#294A38] rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="confirm-title" className="text-base font-bold text-[#FFF9EC]">{state.title}</h2>
            {state.body && <p className="text-xs text-[#B6BDAF] leading-relaxed">{state.body}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => close(false)} className={btn.secondary}>{t('cancel')}</button>
              <button ref={confirmBtn} onClick={() => close(true)} className={state.danger ? btn.danger : btn.primary}>
                {state.confirmLabel || t('confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export const useConfirm = () => useContext(ConfirmContext);

// ---------------------------------------------------------------------------
// Shared bits
// ---------------------------------------------------------------------------
export const btn = {
  primary: 'bg-[#167344] hover:bg-[#218C55] disabled:opacity-40 text-[#FFF9EC] font-semibold px-4 py-2 rounded-xl text-xs inline-flex items-center justify-center gap-1.5 transition',
  hero: 'w-full py-3.5 bg-gradient-to-r from-[#167344] to-[#8F2635] hover:from-[#218C55] hover:to-[#AC3544] disabled:opacity-40 text-[#FFF9EC] font-bold rounded-2xl text-sm flex items-center justify-center gap-2 shadow-lg transition',
  secondary: 'bg-[#1B3B2D] hover:bg-[#28513D] border border-[#365A45] text-[#D6D0BF] px-3 py-2 rounded-xl text-xs inline-flex items-center justify-center gap-1.5 transition',
  danger: 'bg-[#8F2635] hover:bg-[#AC3544] text-[#FFF9EC] font-semibold px-4 py-2 rounded-xl text-xs inline-flex items-center justify-center gap-1.5 transition',
  icon: 'text-[#87988A] hover:text-[#FFF9EC] p-1.5 rounded-lg hover:bg-[#1B3B2D] transition',
};

export const input = 'w-full bg-[#071B14] border border-[#365A45] rounded-xl px-3.5 py-2.5 text-xs text-[#FFF9EC] placeholder-[#5E7363] focus:outline-none focus:ring-2 focus:ring-emerald-500';

export const card = 'bg-[#102B20] border border-[#294A38] rounded-3xl p-6 shadow-xl';

export function LanguageToggle() {
  const { t, toggleLang } = useI18n();
  return (
    <button
      onClick={toggleLang}
      aria-label={t('langToggleLabel')}
      className="bg-[#1B3B2D] hover:bg-[#28513D] border border-[#365A45] text-[#E9BD65] px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md transition"
    >
      <Globe className="w-3.5 h-3.5" />
      <span>{t('langToggle')}</span>
    </button>
  );
}

export function Footer() {
  const { t } = useI18n();
  return <footer className="max-w-md mx-auto w-full text-center text-[11px] text-[#718475] py-6">{t('footer')}</footer>;
}

export function CopyField({ value, tone = 'green' }) {
  const { t } = useI18n();
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast(t('err_generic'), 'error');
    }
  };
  const gold = tone === 'gold';
  return (
    <div className="flex gap-2">
      <input
        readOnly
        value={value}
        onFocus={(e) => e.target.select()}
        className={`w-full bg-[#071B14] border rounded-xl px-3 py-2 text-[11px] font-mono ${gold ? 'border-[#D6AA52]/40 text-[#F2D48B]' : 'border-[#365A45] text-[#83D9A5]'}`}
      />
      <button onClick={copy} className={gold ? 'bg-[#B88935] hover:bg-[#D6AA52] text-slate-950 font-bold px-3 py-2 rounded-xl text-xs whitespace-nowrap' : btn.primary}>
        {copied ? t('copied') : t('copy')}
      </button>
    </div>
  );
}
