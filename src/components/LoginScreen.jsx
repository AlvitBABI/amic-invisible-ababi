import { useState } from 'react';
import { AlertCircle, Gift, Loader2, PlusCircle, Unlock } from 'lucide-react';
import { api } from '../api.js';
import { useI18n } from '../i18n.js';
import { btn, card, Footer, LanguageToggle } from './ui.jsx';

function Shell({ subtitle, children, onCreateNew }) {
  const { t } = useI18n();
  return (
    <div className="min-h-screen bg-[#071B14] text-[#F8F3E7] flex flex-col p-4">
      <div className="flex justify-end"><LanguageToggle /></div>
      <header className="max-w-md mx-auto w-full pt-4 pb-6 text-center">
        <div className="inline-flex items-center justify-center p-3 bg-[#123D29] border border-[#4BAE72]/40 rounded-2xl mb-3 shadow-lg text-[#5BC58A]">
          <Gift className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-extrabold text-[#FFF9EC] tracking-tight">{t('appTitle')}</h1>
        {subtitle && <p className="text-xs text-[#B6BDAF] mt-1">{subtitle}</p>}
      </header>
      <main className="max-w-md mx-auto w-full space-y-4 flex-1">
        {children}
        {onCreateNew && (
          <div className="text-center pt-2">
            <button onClick={onCreateNew} className="text-xs text-[#B6BDAF] hover:text-[#5BC58A] transition inline-flex items-center gap-1.5">
              <PlusCircle className="w-3.5 h-3.5" /> {t('organizeAnother')}
            </button>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}

// Shown when there's no ?draw= in the URL, or the slug doesn't exist.
export function NoDrawScreen({ notFound, onCreateNew }) {
  const { t } = useI18n();
  return (
    <Shell>
      <div className={`${card} text-center space-y-4`}>
        <div className="w-12 h-12 bg-amber-500/10 text-[#E9BD65] border border-[#D6AA52]/40 rounded-2xl flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-[#FFF9EC]">{notFound ? t('drawNotFoundTitle') : t('noDrawTitle')}</h2>
        <p className="text-xs text-[#B6BDAF] leading-relaxed">{notFound ? t('drawNotFoundDesc') : t('noDrawDesc')}</p>
        <button onClick={onCreateNew} className={btn.hero}>
          <PlusCircle className="w-4 h-4" /> {t('createNewDraw')}
        </button>
      </div>
    </Shell>
  );
}

export default function LoginScreen({ draw, onParticipant, onAdmin, onCreateNew }) {
  const { t, tError, formatMoney, formatDate } = useI18n();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const value = pin.trim();
    if (!value) return;
    setBusy(true);
    setError('');
    try {
      const res = await api.login(draw.slug, value);
      setPin('');
      if (res.role === 'admin') onAdmin(res.admin_token);
      else onParticipant(res, value);
    } catch (err) {
      setError(tError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell subtitle={t('activeDraw', { slug: draw.slug })} onCreateNew={onCreateNew}>
      <form onSubmit={submit} className={`${card} space-y-5 text-center`}>
        <div>
          <h2 className="text-lg font-bold text-[#FFF9EC]">{t('loginTitle')}</h2>
          <p className="text-xs text-[#B6BDAF] mt-1">{t('loginDesc')}</p>
        </div>

        <input
          type="password"
          inputMode="numeric"
          autoComplete="off"
          pattern="[0-9]*"
          maxLength={8}
          autoFocus
          aria-label={t('pinLabel')}
          placeholder={t('pinPlaceholder')}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
          className="w-full max-w-[220px] mx-auto text-center text-3xl tracking-[0.4em] font-mono bg-[#071B14] border-2 border-[#365A45] rounded-2xl py-3 text-[#E9BD65] placeholder:text-base placeholder:tracking-normal placeholder-[#5E7363] focus:outline-none focus:border-emerald-500 transition block"
        />

        {error && (
          <p role="alert" className="text-xs text-[#E87575] font-medium bg-[#521E25]/60 border border-[#C95757]/40 p-2.5 rounded-xl">
            {error}
          </p>
        )}

        <button type="submit" disabled={pin.length < 4 || busy} className={btn.hero}>
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Unlock className="w-4 h-4" />} {t('enter')}
        </button>

        {(draw.budget != null || draw.event_date) && (
          <div className="pt-3 border-t border-[#294A38] text-xs text-[#B6BDAF] flex justify-center gap-4 flex-wrap">
            {draw.budget != null && <span>{t('budget')}: <strong className="text-[#E9BD65]">{formatMoney(draw.budget)}</strong></span>}
            {draw.event_date && <span>{t('date')}: <strong className="text-[#5BC58A]">{formatDate(draw.event_date)}</strong></span>}
          </div>
        )}
      </form>
    </Shell>
  );
}
