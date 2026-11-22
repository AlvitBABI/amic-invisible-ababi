import { useCallback, useEffect, useState } from 'react';
import {
  Check, Eye, EyeOff, KeyRound, Loader2, LogOut, RefreshCw, Settings, Share2,
  ShieldAlert, ShieldCheck, Sparkles, Trash2, UserPlus, Users,
} from 'lucide-react';
import { api } from '../api.js';
import { useI18n } from '../i18n.js';
import { btn, card, CopyField, Footer, input, LanguageToggle, useConfirm, useToast } from './ui.jsx';

const baseUrl = () => `${window.location.origin}${window.location.pathname}`;
export const participantUrl = (slug) => `${baseUrl()}?draw=${encodeURIComponent(slug)}`;
const adminUrl = (slug, token) => `${participantUrl(slug)}&admin=${encodeURIComponent(token)}`;

const parseNames = (raw) => raw.split(/[\n,;]+/).map((n) => n.trim()).filter(Boolean);

// ---------------------------------------------------------------------------
// Create a new draw
// ---------------------------------------------------------------------------
export function CreateDraw({ onCreated, onCancel }) {
  const { t, tError } = useI18n();
  const toast = useToast();
  const [name, setName] = useState('');
  const [adminPin, setAdminPin] = useState('');
  const [budget, setBudget] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const res = await api.createDraw({ name: name.trim(), adminPin, budget, eventDate });
      await onCreated(res.slug, res.admin_token);
      toast(t('drawCreated'));
    } catch (err) {
      setError(tError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#071B14] text-[#F8F3E7] flex flex-col p-4">
      <div className="flex justify-between">
        {onCancel ? <button onClick={onCancel} className={btn.secondary}>{t('cancel')}</button> : <span />}
        <LanguageToggle />
      </div>
      <main className="flex-1 max-w-xl w-full mx-auto pt-6">
        <form onSubmit={submit} className={`${card} space-y-4`}>
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center p-3 bg-[#123D29] border border-[#4BAE72]/40 rounded-2xl text-[#5BC58A]">
              <Settings className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold text-[#FFF9EC]">{t('createTitle')}</h1>
            <p className="text-xs text-[#B6BDAF]">{t('createDesc')}</p>
          </div>

          <label className="block">
            <span className="block text-xs text-[#B6BDAF] mb-1">{t('drawName')}</span>
            <input required maxLength={60} value={name} onChange={(e) => setName(e.target.value)} placeholder={t('drawNamePlaceholder')} className={input} />
          </label>
          <label className="block">
            <span className="block text-xs text-[#B6BDAF] mb-1">{t('adminPin')}</span>
            <input
              required type="password" inputMode="numeric" autoComplete="new-password" pattern="[0-9]{4,8}" minLength={4} maxLength={8}
              value={adminPin} onChange={(e) => setAdminPin(e.target.value.replace(/\D/g, ''))}
              className={`${input} font-mono tracking-widest text-[#E9BD65]`}
            />
            <span className="block text-[10px] text-[#87988A] mt-1">{t('adminPinHint')}</span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="block text-xs text-[#B6BDAF] mb-1">{t('budgetEur')}</span>
              <input type="number" min="0" step="0.01" inputMode="decimal" value={budget} onChange={(e) => setBudget(e.target.value)} className={input} />
            </label>
            <label className="block">
              <span className="block text-xs text-[#B6BDAF] mb-1">{t('eventDate')}</span>
              <input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} className={`${input} [color-scheme:dark]`} />
            </label>
          </div>

          {error && <p role="alert" className="text-xs text-[#E87575] bg-[#521E25]/60 border border-[#C95757]/40 p-2.5 rounded-xl">{error}</p>}

          <button type="submit" disabled={busy || !name.trim() || adminPin.length < 4} className={btn.hero}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-[#F2D48B]" />}
            {busy ? t('creating') : t('createBtn')}
          </button>
        </form>
      </main>
      <Footer />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Admin panel
// ---------------------------------------------------------------------------
export default function AdminPanel({ slug, token, onLogout, onUnauthorized }) {
  const { t, tError, formatDate } = useI18n();
  const toast = useToast();
  const confirm = useConfirm();
  const [state, setState] = useState(null); // { draw, participants }
  const [tab, setTab] = useState('participants');
  const [busy, setBusy] = useState(false);

  const handleError = useCallback((err) => {
    if (err?.code === 'unauthorized') onUnauthorized();
    else toast(tError(err), 'error');
  }, [onUnauthorized, toast, tError]);

  const reload = useCallback(async () => {
    try {
      setState(await api.adminGet(slug, token));
    } catch (err) {
      handleError(err);
    }
  }, [slug, token, handleError]);

  useEffect(() => { reload(); }, [reload]);

  // Runs an admin action, then refreshes the data.
  const run = async (fn, onSuccess) => {
    setBusy(true);
    try {
      const res = await fn();
      await reload();
      onSuccess?.(res);
      return true;
    } catch (err) {
      handleError(err);
      return false;
    } finally {
      setBusy(false);
    }
  };

  if (!state) {
    return (
      <div className="min-h-screen bg-[#071B14] text-[#5BC58A] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="text-xs text-[#B6BDAF]">{t('loading')}</span>
      </div>
    );
  }

  const { draw, participants } = state;
  const drawn = Boolean(draw.drawn_at);

  return (
    <div className="min-h-screen bg-[#071B14] text-[#F8F3E7] flex flex-col">
      <header className="border-b border-[#294A38] bg-[#102B20]/90 backdrop-blur sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="bg-gradient-to-tr from-[#E9BD65] to-[#B88935] p-2.5 rounded-2xl text-slate-950 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h1 className="font-bold text-[#FFF9EC] truncate">{t('organizerPanel')}</h1>
              <p className="text-xs text-[#B6BDAF] font-mono truncate">{draw.slug}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <button onClick={onLogout} className={btn.secondary}>
              <LogOut className="w-3.5 h-3.5 text-[#E87575]" /> <span className="hidden sm:inline">{t('logout')}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl w-full mx-auto px-4 pt-6 space-y-6 flex-1">
        <nav className="flex border-b border-[#294A38] gap-4" role="tablist">
          {[['participants', t('tabParticipants'), Users], ['settings', t('tabSettings'), Settings]].map(([id, label, Icon]) => (
            <button
              key={id}
              role="tab"
              aria-selected={tab === id}
              onClick={() => setTab(id)}
              className={`pb-3 text-sm font-semibold border-b-2 inline-flex items-center gap-1.5 ${tab === id ? 'border-emerald-500 text-[#5BC58A]' : 'border-transparent text-[#B6BDAF]'}`}
            >
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </nav>

        {tab === 'participants' ? (
          <>
            <LinksCard slug={draw.slug} token={draw.admin_token} />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-6">
                {!drawn ? (
                  <AddParticipants
                    busy={busy}
                    onAdd={(names) => run(() => api.adminAddParticipants(slug, token, names), (res) => toast(t('participantsAdded', { n: res.length })))}
                  />
                ) : (
                  <LateJoin
                    busy={busy}
                    onAdd={(name) => run(() => api.adminAddLateParticipant(slug, token, name), (res) => toast(t('lateJoinToast', { name: res.name })))}
                  />
                )}

                <div className={`${card} space-y-3`}>
                  {drawn && (
                    <p className="text-xs text-[#83D9A5] flex items-center gap-1.5">
                      <Check className="w-4 h-4" /> {t('drawDone', { date: formatDate(draw.drawn_at) })}
                    </p>
                  )}
                  <button
                    disabled={busy || participants.length < 3}
                    onClick={async () => {
                      if (drawn && !(await confirm({ title: t('rerunConfirmTitle'), body: t('rerunConfirmBody'), danger: true, confirmLabel: t('rerunDraw') }))) return;
                      run(() => api.adminRunDraw(slug, token), () => toast(t('drawRunToast')));
                    }}
                    className={btn.hero}
                  >
                    {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : drawn ? <RefreshCw className="w-4 h-4" /> : <Sparkles className="w-4 h-4 text-[#F2D48B]" />}
                    {drawn ? t('rerunDraw') : t('runDraw')}
                  </button>
                  {participants.length < 3 && <p className="text-[11px] text-[#87988A] text-center">{t('min3Hint')}</p>}
                </div>
              </div>

              <ParticipantTable
                className="md:col-span-2"
                slug={draw.slug}
                participants={participants}
                drawn={drawn}
                busy={busy}
                onResetPin={async (p) => {
                  if (!(await confirm({ title: t('resetPinConfirmTitle', { name: p.name }), body: t('resetPinConfirmBody') }))) return;
                  run(() => api.adminResetPin(slug, token, p.id), (res) => toast(t('resetPinToast', { name: p.name, pin: res.pin })));
                }}
                onRemove={async (p) => {
                  const ok = await confirm({
                    title: t('removeConfirmTitle', { name: p.name }),
                    body: drawn ? `${t('removeConfirmBody')} ${t('removeConfirmBodyDrawn', { name: p.name })}` : t('removeConfirmBody'),
                    danger: true,
                    confirmLabel: t('remove'),
                  });
                  if (!ok) return;
                  run(() => api.adminRemoveParticipant(slug, token, p.id), (res) => {
                    toast(t('removedToast', { name: p.name }));
                    if (res.draw_reset) toast(t('drawResetToast'), 'error');
                  });
                }}
              />
            </div>
          </>
        ) : (
          <SettingsForm
            draw={draw}
            busy={busy}
            onSave={(values) => run(() => api.adminUpdateSettings(slug, token, values), () => toast(t('settingsSaved')))}
          />
        )}
      </main>
      <Footer />
    </div>
  );
}

function LinksCard({ slug, token }) {
  const { t } = useI18n();
  return (
    <div className={`${card} space-y-4`}>
      <div className="space-y-2">
        <h2 className="text-sm font-bold text-[#FFF9EC]">{t('participantLink')}</h2>
        <p className="text-xs text-[#B6BDAF]">{t('participantLinkDesc')}</p>
        <CopyField value={participantUrl(slug)} />
      </div>
      <div className="bg-[#4A3519]/40 border border-[#D6AA52]/40 p-4 rounded-2xl space-y-2">
        <div className="flex items-center gap-2 text-[#E9BD65] text-xs font-bold">
          <ShieldAlert className="w-4 h-4" /> {t('adminLink')}
        </div>
        <p className="text-[11px] text-[#D6C9A5]">{t('adminLinkDesc')}</p>
        <CopyField value={adminUrl(slug, token)} tone="gold" />
      </div>
    </div>
  );
}

function AddParticipants({ onAdd, busy }) {
  const { t } = useI18n();
  const [name, setName] = useState('');
  const [bulk, setBulk] = useState('');
  const [bulkMode, setBulkMode] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    const names = bulkMode ? parseNames(bulk) : [name.trim()].filter(Boolean);
    if (!names.length) return;
    if (await onAdd(names)) {
      setName('');
      setBulk('');
      setBulkMode(false);
    }
  };

  return (
    <form onSubmit={submit} className={`${card} space-y-3`}>
      <h3 className="font-bold text-[#FFF9EC] text-sm flex items-center gap-2">
        <UserPlus className="w-4 h-4 text-[#5BC58A]" /> {t('addParticipants')}
      </h3>
      {bulkMode ? (
        <textarea rows={5} value={bulk} onChange={(e) => setBulk(e.target.value)} placeholder={t('bulkPlaceholder')} className={input} />
      ) : (
        <input maxLength={60} value={name} onChange={(e) => setName(e.target.value)} placeholder={t('namePlaceholder')} className={input} />
      )}
      <button type="submit" disabled={busy || (bulkMode ? !bulk.trim() : !name.trim())} className={`${btn.primary} w-full`}>
        {busy && <Loader2 className="w-4 h-4 animate-spin" />} {bulkMode ? t('addAll') : t('add')}
      </button>
      <button type="button" onClick={() => setBulkMode((b) => !b)} className="w-full text-xs text-[#B6BDAF] hover:text-[#E9E4D5] py-1">
        {bulkMode ? t('cancel') : t('bulkToggle')}
      </button>
    </form>
  );
}

function LateJoin({ onAdd, busy }) {
  const { t } = useI18n();
  const [name, setName] = useState('');
  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (await onAdd(name.trim())) setName('');
  };
  return (
    <form onSubmit={submit} className={`${card} space-y-3`}>
      <h3 className="font-bold text-[#FFF9EC] text-sm flex items-center gap-2">
        <UserPlus className="w-4 h-4 text-[#5BC58A]" /> {t('lateJoin')}
      </h3>
      <p className="text-[11px] text-[#B6BDAF]">{t('lateJoinDesc')}</p>
      <input maxLength={60} value={name} onChange={(e) => setName(e.target.value)} placeholder={t('namePlaceholder')} className={input} />
      <button type="submit" disabled={busy || !name.trim()} className={`${btn.primary} w-full`}>
        {busy && <Loader2 className="w-4 h-4 animate-spin" />} {t('add')}
      </button>
    </form>
  );
}

function Hidden({ value, visible, onToggle, showLabel, hideLabel, mono }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`${mono ? 'font-mono tracking-widest' : 'font-semibold'} ${visible ? 'text-[#E9BD65]' : 'text-[#5E7363]'}`}>
        {visible ? value : '••••'}
      </span>
      <button onClick={onToggle} className={btn.icon} aria-label={visible ? hideLabel : showLabel} title={visible ? hideLabel : showLabel}>
        {visible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
}

function ParticipantTable({ className, slug, participants, drawn, busy, onResetPin, onRemove }) {
  const { t } = useI18n();
  const toast = useToast();
  const [shownPins, setShownPins] = useState({});
  const [shownRecipients, setShownRecipients] = useState({});
  const toggle = (setter, id) => setter((s) => ({ ...s, [id]: !s[id] }));

  const share = async (p) => {
    const text = t('shareMessage', { name: p.name, url: participantUrl(slug), pin: p.pin });
    if (navigator.share) {
      try {
        await navigator.share({ text });
        return;
      } catch (err) {
        if (err?.name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      toast(t('shareCopied'));
    } catch {
      toast(t('err_generic'), 'error');
    }
  };

  return (
    <div className={`${card} ${className} space-y-4`}>
      <div className="flex items-center justify-between border-b border-[#294A38] pb-3">
        <h3 className="font-bold text-[#FFF9EC]">{t('tabParticipants')}</h3>
        <span className="text-xs text-[#5BC58A]">{t('participantsCount', { n: participants.length })}</span>
      </div>

      {participants.length === 0 ? (
        <div className="py-10 text-center text-[#87988A] text-xs border border-dashed border-[#294A38] rounded-2xl">{t('noParticipants')}</div>
      ) : (
        <div className="overflow-x-auto -mx-2">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#294A38] text-[#B6BDAF] uppercase text-[10px]">
                <th className="py-2 px-2">{t('colName')}</th>
                <th className="py-2 px-2">{t('colPin')}</th>
                {drawn && <th className="py-2 px-2">{t('colRecipient')}</th>}
                <th className="py-2 px-2 text-center">{t('colWishes')}</th>
                <th className="py-2 px-2 text-right">{t('colActions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1B3B2D]">
              {participants.map((p) => (
                <tr key={p.id}>
                  <td className="py-2.5 px-2 font-bold text-[#FFF9EC] break-words">{p.name}</td>
                  <td className="py-2.5 px-2">
                    <Hidden mono value={p.pin} visible={shownPins[p.id]} onToggle={() => toggle(setShownPins, p.id)} showLabel={t('showPin')} hideLabel={t('hidePin')} />
                  </td>
                  {drawn && (
                    <td className="py-2.5 px-2">
                      <Hidden value={p.recipient_name} visible={shownRecipients[p.id]} onToggle={() => toggle(setShownRecipients, p.id)} showLabel={t('showRecipient')} hideLabel={t('hideRecipient')} />
                    </td>
                  )}
                  <td className="py-2.5 px-2 text-center text-[#B6BDAF]">{p.wish_count}</td>
                  <td className="py-2.5 px-2">
                    <div className="flex justify-end gap-0.5">
                      <button onClick={() => share(p)} className={btn.icon} aria-label={t('sharePin')} title={t('sharePin')}><Share2 className="w-3.5 h-3.5" /></button>
                      <button disabled={busy} onClick={() => onResetPin(p)} className={btn.icon} aria-label={t('resetPin')} title={t('resetPin')}><KeyRound className="w-3.5 h-3.5" /></button>
                      <button disabled={busy} onClick={() => onRemove(p)} className={`${btn.icon} hover:text-[#E87575]`} aria-label={t('remove')} title={t('remove')}><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SettingsForm({ draw, busy, onSave }) {
  const { t } = useI18n();
  const [budget, setBudget] = useState(draw.budget ?? '');
  const [eventDate, setEventDate] = useState(draw.event_date ?? '');
  const [newAdminPin, setNewAdminPin] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (await onSave({ budget, eventDate, newAdminPin })) setNewAdminPin('');
  };

  return (
    <form onSubmit={submit} className={`${card} space-y-4 max-w-lg`}>
      <div>
        <h2 className="text-lg font-bold text-[#FFF9EC]">{t('settingsTitle')}</h2>
        <p className="text-xs text-[#B6BDAF] mt-1">{t('settingsDesc')}</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="block text-xs text-[#B6BDAF] mb-1">{t('budgetEur')}</span>
          <input type="number" min="0" step="0.01" inputMode="decimal" value={budget} onChange={(e) => setBudget(e.target.value)} className={input} />
        </label>
        <label className="block">
          <span className="block text-xs text-[#B6BDAF] mb-1">{t('eventDate')}</span>
          <input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} className={`${input} [color-scheme:dark]`} />
        </label>
      </div>
      <label className="block">
        <span className="block text-xs text-[#B6BDAF] mb-1">{t('newAdminPin')}</span>
        <input
          type="password" inputMode="numeric" autoComplete="new-password" pattern="[0-9]{4,8}" minLength={4} maxLength={8}
          value={newAdminPin} onChange={(e) => setNewAdminPin(e.target.value.replace(/\D/g, ''))}
          className={`${input} font-mono tracking-widest text-[#E9BD65]`}
        />
        <span className="block text-[10px] text-[#87988A] mt-1">{t('newAdminPinHint')}</span>
      </label>
      <button type="submit" disabled={busy} className={btn.primary}>
        {busy && <Loader2 className="w-4 h-4 animate-spin" />} {t('save')}
      </button>
    </form>
  );
}
