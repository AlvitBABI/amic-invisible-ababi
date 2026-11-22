import { useState } from 'react';
import { Eye, EyeOff, Gift, Heart, Hourglass, Loader2, LogOut, Plus, Sparkles, Trash2 } from 'lucide-react';
import { api } from '../api.js';
import { useI18n } from '../i18n.js';
import { btn, card, Footer, input, LanguageToggle, useToast } from './ui.jsx';

const MAX_WISH = 200;

export default function ParticipantView({ session, onLogout }) {
  const { t, tError, formatMoney, formatDate } = useI18n();
  const toast = useToast();
  const { slug, pin, data } = session;
  const [revealed, setRevealed] = useState(false);
  const [myWishes, setMyWishes] = useState(data.my_wishlist);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  const addWish = async (e) => {
    e.preventDefault();
    const value = text.trim();
    if (!value) return;
    setBusy(true);
    try {
      const item = await api.addWish(slug, pin, value);
      setMyWishes((w) => [...w, item]);
      setText('');
      toast(t('wishAdded'));
    } catch (err) {
      toast(tError(err), 'error');
    } finally {
      setBusy(false);
    }
  };

  const removeWish = async (id) => {
    try {
      await api.removeWish(slug, pin, id);
      setMyWishes((w) => w.filter((x) => x.id !== id));
      toast(t('wishRemoved'));
    } catch (err) {
      toast(tError(err), 'error');
    }
  };

  const { draw } = data;

  return (
    <div className="min-h-screen bg-[#071B14] text-[#F8F3E7] flex flex-col">
      <header className="border-b border-[#294A38] bg-[#102B20]/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="bg-gradient-to-tr from-[#167344] to-[#8F2635] p-2 rounded-xl text-[#FFF9EC] shrink-0">
              <Gift className="w-5 h-5" />
            </div>
            <span className="font-bold text-[#D7F2DE] truncate">{t('appTitle')}</span>
          </div>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <button onClick={onLogout} className={btn.secondary}>
              <LogOut className="w-3.5 h-3.5 text-[#E87575]" /> {t('logout')}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-xl w-full mx-auto px-4 pt-6 space-y-6 flex-1">
        <div className="bg-[#102B20] border border-[#294A38] px-4 py-3 rounded-2xl text-xs text-[#D6D0BF] flex flex-wrap justify-between gap-2">
          <span>{t('connectedAs', { name: data.name })}</span>
          <span className="flex gap-3">
            {draw.budget != null && <span>{t('budget')}: <strong className="text-[#E9BD65]">{formatMoney(draw.budget)}</strong></span>}
            {draw.event_date && <span>{t('date')}: <strong className="text-[#5BC58A]">{formatDate(draw.event_date)}</strong></span>}
          </span>
        </div>

        <section className={`${card} text-center space-y-6`}>
          <div className="inline-flex items-center gap-2 bg-[#123D29] border border-[#4BAE72]/40 text-[#83D9A5] text-xs font-semibold px-3 py-1 rounded-full">
            <Sparkles className="w-3.5 h-3.5 text-[#E9BD65]" />
            <span>{t('privateAssignment')}</span>
          </div>
          <h1 className="text-2xl font-extrabold text-[#FFF9EC]">{t('hello', { name: data.name })}</h1>

          {!data.recipient_name ? (
            <div className="p-6 bg-[#071B14] border border-dashed border-[#365A45] rounded-2xl text-xs text-[#B6BDAF] flex flex-col items-center gap-2">
              <Hourglass className="w-6 h-6 text-[#E9BD65]" />
              {t('notDrawnYet')}
            </div>
          ) : !revealed ? (
            <button
              onClick={() => setRevealed(true)}
              className="w-full py-8 px-4 bg-gradient-to-br from-[#167344] to-[#104D32] hover:from-[#218C55] hover:to-[#17643F] text-[#FFF9EC] font-bold rounded-2xl shadow-xl border border-[#70C98B]/40 flex flex-col items-center gap-2"
            >
              <Eye className="w-8 h-8 text-emerald-200" />
              <span className="text-base sm:text-lg">{t('revealBtn')}</span>
            </button>
          ) : (
            <div className="p-6 bg-[#071B14] border-2 border-[#4BAE72]/60 rounded-2xl space-y-4 text-left">
              <div className="text-center">
                <div className="text-xs text-[#B6BDAF] uppercase tracking-wider mb-1">{t('yourRecipient')}</div>
                <div className="text-3xl sm:text-4xl font-black text-[#E9BD65] my-2 break-words">🎁 {data.recipient_name} 🎁</div>
              </div>
              <div className="pt-4 border-t border-[#294A38] space-y-2">
                <h3 className="text-xs font-bold text-[#83D9A5] uppercase tracking-wide flex items-center gap-1.5">
                  <Heart className="w-3.5 h-3.5 text-[#E87575]" />
                  {t('recipientWishes', { name: data.recipient_name })}
                </h3>
                {data.recipient_wishlist.length > 0 ? (
                  <ul className="space-y-1.5 bg-[#102B20] border border-[#294A38] p-3 rounded-xl">
                    {data.recipient_wishlist.map((item, i) => (
                      <li key={i} className="text-xs text-[#E9E4D5] flex items-start gap-2 break-words">
                        <span className="w-1.5 h-1.5 mt-1.5 bg-emerald-400 rounded-full shrink-0" />
                        {item.text}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-[#87988A] italic bg-[#102B20]/50 p-3 rounded-xl text-center">{t('noRecipientWishes')}</p>
                )}
              </div>
              <div className="text-center pt-2">
                <button onClick={() => setRevealed(false)} className="text-xs text-[#B6BDAF] hover:text-[#E9E4D5] inline-flex items-center gap-1 underline">
                  <EyeOff className="w-3.5 h-3.5" /> {t('hideForSafety')}
                </button>
              </div>
            </div>
          )}
        </section>

        <section className={`${card} space-y-4`}>
          <div>
            <h2 className="text-base font-bold text-[#FFF9EC] flex items-center gap-2">
              <Heart className="w-5 h-5 text-[#E87575]" /> {t('myWishlist')}
            </h2>
            <p className="text-xs text-[#B6BDAF] mt-1">{t('myWishlistDesc')}</p>
          </div>

          <form onSubmit={addWish} className="space-y-1">
            <div className="flex gap-2">
              <input
                type="text"
                maxLength={MAX_WISH}
                placeholder={t('wishPlaceholder')}
                value={text}
                onChange={(e) => setText(e.target.value)}
                className={input}
              />
              <button type="submit" disabled={!text.trim() || busy} className={btn.primary}>
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} {t('add')}
              </button>
            </div>
            {text.length > MAX_WISH - 40 && (
              <p className="text-[10px] text-[#87988A]">{t('charsLeft', { n: MAX_WISH - text.length })}</p>
            )}
          </form>

          {myWishes.length > 0 ? (
            <ul className="space-y-2">
              {myWishes.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-2 bg-[#071B14] border border-[#294A38] px-3.5 py-2.5 rounded-xl text-xs text-[#E9E4D5]">
                  <span className="break-words min-w-0">{item.text}</span>
                  <button onClick={() => removeWish(item.id)} className={btn.icon} aria-label={t('remove')} title={t('remove')}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-center py-4 text-[#87988A] text-xs border border-dashed border-[#294A38] rounded-xl">{t('noMyWishes')}</p>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}
