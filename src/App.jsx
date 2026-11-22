import { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { api } from './api.js';
import { I18nProvider, useI18n } from './i18n.js';
import { ConfirmProvider, ToastProvider, useToast } from './components/ui.jsx';
import LoginScreen, { NoDrawScreen } from './components/LoginScreen.jsx';
import ParticipantView from './components/ParticipantView.jsx';
import AdminPanel, { CreateDraw } from './components/AdminPanel.jsx';

// The admin token lives in sessionStorage (per tab) so a refresh keeps the
// organizer signed in. Participant PINs are only kept in memory.
const tokenKey = (slug) => `amic-invisible:admin:${slug}`;
const readToken = (slug) => { try { return sessionStorage.getItem(tokenKey(slug)); } catch { return null; } };
const saveToken = (slug, token) => { try { sessionStorage.setItem(tokenKey(slug), token); } catch { /* ignore */ } };
const clearToken = (slug) => { try { sessionStorage.removeItem(tokenKey(slug)); } catch { /* ignore */ } };

const setUrl = (slug) => {
  const url = slug ? `${window.location.pathname}?draw=${encodeURIComponent(slug)}` : window.location.pathname;
  window.history.replaceState({}, '', url);
};

function Main() {
  const { t, tError } = useI18n();
  const toast = useToast();
  // view: loading | none | notfound | create | login | participant | admin
  const [view, setView] = useState('loading');
  const [draw, setDraw] = useState(null);
  const [adminToken, setAdminToken] = useState(null);
  const [session, setSession] = useState(null); // participant { slug, pin, data }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const slug = params.get('draw');
    const urlToken = params.get('admin');
    if (!slug) {
      setView('none');
      return;
    }
    (async () => {
      try {
        const d = await api.getDraw(slug);
        if (!d) {
          setView('notfound');
          return;
        }
        setDraw(d);
        const token = urlToken || readToken(slug);
        if (urlToken) setUrl(slug); // don't leave the admin token in the address bar
        if (token) {
          saveToken(slug, token);
          setAdminToken(token);
          setView('admin');
        } else {
          setView('login');
        }
      } catch (err) {
        toast(tError(err), 'error');
        setView('notfound');
      }
    })();
    // Runs once on mount; the URL is only read at startup.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openAdmin = (slug, token) => {
    saveToken(slug, token);
    setAdminToken(token);
    setView('admin');
  };

  const logoutAdmin = useCallback(() => {
    if (draw) {
      clearToken(draw.slug);
      api.getDraw(draw.slug).then((d) => d && setDraw(d)).catch(() => {}); // pick up edited settings
    }
    setAdminToken(null);
    setView(draw ? 'login' : 'none');
  }, [draw]);

  const onUnauthorized = useCallback(() => {
    toast(t('err_unauthorized'), 'error');
    logoutAdmin();
  }, [toast, t, logoutAdmin]);

  const startCreate = () => setView('create');

  switch (view) {
    case 'loading':
      return (
        <div className="min-h-screen bg-[#071B14] text-[#5BC58A] flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin" />
          <span className="text-xs text-[#B6BDAF]">{t('loading')}</span>
        </div>
      );
    case 'none':
    case 'notfound':
      return <NoDrawScreen notFound={view === 'notfound'} onCreateNew={startCreate} />;
    case 'create':
      return (
        <CreateDraw
          onCancel={() => setView(draw ? 'login' : 'none')}
          onCreated={async (slug, token) => {
            setUrl(slug);
            setDraw(await api.getDraw(slug));
            openAdmin(slug, token);
          }}
        />
      );
    case 'participant':
      return (
        <ParticipantView
          session={session}
          onLogout={() => {
            setSession(null);
            setView('login');
          }}
        />
      );
    case 'admin':
      return <AdminPanel slug={draw.slug} token={adminToken} onLogout={logoutAdmin} onUnauthorized={onUnauthorized} />;
    default:
      return (
        <LoginScreen
          draw={draw}
          onCreateNew={startCreate}
          onAdmin={(token) => {
            toast(t('adminLoggedIn'));
            openAdmin(draw.slug, token);
          }}
          onParticipant={(data, pin) => {
            setSession({ slug: draw.slug, pin, data });
            setView('participant');
          }}
        />
      );
  }
}

export default function App() {
  return (
    <I18nProvider>
      <ToastProvider>
        <ConfirmProvider>
          <Main />
        </ConfirmProvider>
      </ToastProvider>
    </I18nProvider>
  );
}
