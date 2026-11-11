import React, { useState, useEffect } from 'react';
import { 
  Gift, 
  UserPlus, 
  Trash2, 
  Copy, 
  Check, 
  Sparkles, 
  Eye, 
  EyeOff, 
  RefreshCw, 
  Lock, 
  Unlock,
  KeyRound,
  ShieldCheck,
  AlertCircle,
  Calendar,
  Heart,
  Plus,
  ArrowRight,
  LogOut,
  ShieldAlert
} from 'lucide-react';

// --- UTILITY FUNCTIONS FOR BASE64 URL SAFE ENCODING ---
const encodeData = (obj) => {
  try {
    const str = JSON.stringify(obj);
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (match, p1) => 
      String.fromCharCode('0x' + p1)
    ));
  } catch (e) {
    console.error('Error encoding data', e);
    return '';
  }
};

const decodeData = (str) => {
  try {
    const jsonStr = decodeURIComponent(Array.prototype.map.call(atob(str), (c) => {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonStr);
  } catch (e) {
    console.error('Error decoding data', e);
    return null;
  }
};

export default function App() {
  // Global App State (decoded from URL hash if present)
  const [drawPayload, setDrawPayload] = useState(null); 
  // drawPayload contains: { assignments: [{ giver, pin, recipient }], wishlists: { [name]: [items] }, adminPin, emergencyToken, budget, date }

  // Navigation / Login State
  const [mode, setMode] = useState('login'); // 'login' | 'participant_view' | 'admin_panel'
  const [adminTab, setAdminTab] = useState('setup'); // 'setup' | 'results'

  // Login Form Input State
  const [loginInput, setLoginInput] = useState('');
  const [loginError, setLoginError] = useState('');

  // Admin Setup State
  const [nameInput, setNameInput] = useState('');
  const [bulkInput, setBulkInput] = useState('');
  const [showBulkInput, setShowBulkInput] = useState(false);
  const [participants, setParticipants] = useState([]); // [{ name, pin }]
  const [adminPinInput, setAdminPinInput] = useState('1234');
  const [budget, setBudget] = useState('20€');
  const [eventDate, setEventDate] = useState('');
  const [drawError, setDrawError] = useState('');
  const [copiedMasterLink, setCopiedMasterLink] = useState(false);
  const [copiedEmergencyLink, setCopiedEmergencyLink] = useState(false);

  // Participant Reveal State
  const [currentGiver, setCurrentGiver] = useState(null); // Logged in participant object
  const [isRevealed, setIsRevealed] = useState(false);

  // Participant Wishlist Input State
  const [newWishItem, setNewWishItem] = useState('');

  // Listen for Hash Changes & Emergency URL Param on Load
  useEffect(() => {
    const handleUrlState = () => {
      const hash = window.location.hash;
      let decodedPayload = null;

      if (hash && hash.startsWith('#data=')) {
        const encoded = hash.replace('#data=', '');
        decodedPayload = decodeData(encoded);
        if (decodedPayload && decodedPayload.assignments) {
          setDrawPayload(decodedPayload);
        }
      }

      // Check for Emergency Admin Query Param (?admin=emergency)
      const params = new URLSearchParams(window.location.search);
      const emergencyParam = params.get('admin');

      if (emergencyParam && decodedPayload && decodedPayload.emergencyToken && emergencyParam === decodedPayload.emergencyToken) {
        setMode('admin_panel');
        setAdminTab('results');
      }
    };

    handleUrlState();
    window.addEventListener('hashchange', handleUrlState);
    return () => window.removeEventListener('hashchange', handleUrlState);
  }, []);

  // --- ADMIN SETUP HANDLERS ---
  const handleAddParticipant = (e) => {
    e?.preventDefault();
    const trimmed = nameInput.trim();
    if (!trimmed) return;
    if (participants.some(p => p.name.toLowerCase() === trimmed.toLowerCase())) {
      setDrawError(`El nom "${trimmed}" ja està a la llista.`);
      return;
    }
    const pin = Math.floor(1000 + Math.random() * 9000).toString();
    setParticipants([...participants, { name: trimmed, pin }]);
    setNameInput('');
    setDrawError('');
  };

  const handleAddBulk = () => {
    const names = bulkInput
      .split(/[\n,]+/)
      .map(n => n.trim())
      .filter(n => n.length > 0);

    const existingNames = participants.map(p => p.name.toLowerCase());
    const newItems = [];
    
    names.forEach(n => {
      if (!existingNames.includes(n.toLowerCase())) {
        const pin = Math.floor(1000 + Math.random() * 9000).toString();
        newItems.push({ name: n, pin });
        existingNames.push(n.toLowerCase());
      }
    });

    setParticipants([...participants, ...newItems]);
    setBulkInput('');
    setShowBulkInput(false);
    setDrawError('');
  };

  const handleRemoveParticipant = (index) => {
    setParticipants(participants.filter((_, i) => i !== index));
  };

  const handleRegeneratePin = (index) => {
    const updated = [...participants];
    updated[index].pin = Math.floor(1000 + Math.random() * 9000).toString();
    setParticipants(updated);
  };

  const handleGenerateDraw = () => {
    if (participants.length < 3) {
      setDrawError('Es necessiten almenys 3 participants per fer el sorteig!');
      return;
    }
    setDrawError('');

    const givers = [...participants];
    let receivers = [...participants];
    let valid = false;
    let attempts = 0;

    while (!valid && attempts < 500) {
      attempts++;
      for (let i = receivers.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [receivers[i], receivers[j]] = [receivers[j], receivers[i]];
      }
      valid = givers.every((giver, idx) => giver.name !== receivers[idx].name);
    }

    if (!valid) {
      setDrawError('Hi ha hagut un error generant el sorteig. Torna-ho a intentar.');
      return;
    }

    const assignments = givers.map((giver, idx) => ({
      giver: giver.name,
      pin: giver.pin,
      recipient: receivers[idx].name
    }));

    // Generate emergency secure alphanumeric token for organizer recovery
    const emergencyToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

    const initialWishlists = {};
    participants.forEach(p => {
      initialWishlists[p.name] = [];
    });

    const payload = {
      assignments,
      wishlists: initialWishlists,
      adminPin: adminPinInput.trim() || '1234',
      emergencyToken,
      budget: budget || '20€',
      date: eventDate || ''
    };

    setDrawPayload(payload);
    
    const encoded = encodeData(payload);
    window.location.hash = `data=${encoded}`;
    
    setAdminTab('results');
    setMode('admin_panel');
  };

  // Sync payload updates to URL hash
  const updatePayloadState = (newPayload) => {
    setDrawPayload(newPayload);
    const encoded = encodeData(newPayload);
    window.location.hash = `data=${encoded}`;
  };

  const getMasterUrl = () => {
    if (!drawPayload) return window.location.origin + window.location.pathname;
    const baseUrl = window.location.origin + window.location.pathname;
    const encoded = encodeData(drawPayload);
    return `${baseUrl}#data=${encoded}`;
  };

  const getEmergencyUrl = () => {
    if (!drawPayload || !drawPayload.emergencyToken) return '';
    const baseUrl = window.location.origin + window.location.pathname;
    const encoded = encodeData(drawPayload);
    return `${baseUrl}?admin=${drawPayload.emergencyToken}#data=${encoded}`;
  };

  const copyMasterLink = () => {
    navigator.clipboard.writeText(getMasterUrl());
    setCopiedMasterLink(true);
    setTimeout(() => setCopiedMasterLink(false), 2500);
  };

  const copyEmergencyLink = () => {
    navigator.clipboard.writeText(getEmergencyUrl());
    setCopiedEmergencyLink(true);
    setTimeout(() => setCopiedEmergencyLink(false), 2500);
  };

  // --- LOGIN & AUTHENTICATION HANDLER ---
  const handleLoginSubmit = (e) => {
    e?.preventDefault();
    setLoginError('');

    const input = loginInput.trim();
    if (!input) return;

    if (!drawPayload || !drawPayload.assignments) {
      setLoginError("Encara no s'ha configurat cap sorteig. Demana l'enllaç a l'organitzador.");
      return;
    }

    // 1. Check if input matches Admin PIN
    if (input === drawPayload.adminPin) {
      setMode('admin_panel');
      setAdminTab('results');
      setLoginInput('');
      return;
    }

    // 2. Check if input matches a Participant 4-digit PIN
    const match = drawPayload.assignments.find(a => a.pin === input);
    if (match) {
      setCurrentGiver(match);
      setMode('participant_view');
      setIsRevealed(false);
      setLoginInput('');
    } else {
      setLoginError('Codi PIN o contrasenya incorrectes. Torna-ho a provar.');
    }
  };

  const handleLogout = () => {
    setCurrentGiver(null);
    setLoginInput('');
    setIsRevealed(false);
    setLoginError('');
    setMode('login');
  };

  // --- WISHLIST HANDLERS (Stored inside shared payload) ---
  const handleAddWishItem = (e) => {
    e?.preventDefault();
    if (!newWishItem.trim() || !currentGiver || !drawPayload) return;

    const currentName = currentGiver.giver;
    const currentList = drawPayload.wishlists?.[currentName] || [];
    const updatedList = [...currentList, newWishItem.trim()];

    const updatedWishlists = {
      ...(drawPayload.wishlists || {}),
      [currentName]: updatedList
    };

    const updatedPayload = {
      ...drawPayload,
      wishlists: updatedWishlists
    };

    updatePayloadState(updatedPayload);
    setNewWishItem('');
  };

  const handleRemoveWishItem = (index) => {
    if (!currentGiver || !drawPayload) return;

    const currentName = currentGiver.giver;
    const currentList = drawPayload.wishlists?.[currentName] || [];
    const updatedList = currentList.filter((_, i) => i !== index);

    const updatedWishlists = {
      ...(drawPayload.wishlists || {}),
      [currentName]: updatedList
    };

    const updatedPayload = {
      ...drawPayload,
      wishlists: updatedWishlists
    };

    updatePayloadState(updatedPayload);
  };


  // =========================================================================
  // 1. LOGIN SCREEN (SECURE GATEWAY FOR ALL USERS)
  // =========================================================================
  if (mode === 'login') {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-emerald-500 selection:text-white flex flex-col justify-between p-4">
        <header className="max-w-md mx-auto w-full pt-8 text-center">
          <div className="inline-flex items-center justify-center p-3 bg-emerald-950 border border-emerald-500/30 rounded-2xl mb-3 shadow-lg text-emerald-400">
            <Gift className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Amic Invisible Secret</h1>
          <p className="text-xs text-slate-400 mt-1">Accés segur amb codi PIN personalitzat</p>
        </header>

        <main className="max-w-md mx-auto w-full px-2">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 relative overflow-hidden">
            {!drawPayload ? (
              <div className="text-center space-y-4 py-4">
                <div className="w-12 h-12 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-2xl flex items-center justify-center mx-auto">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <h2 className="text-lg font-bold text-white">Cap sorteig actiu en aquest enllaç</h2>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Si ets l'organitzador i vols configurar un nou sorteig des de zero, fes clic al botó inferior.
                </p>
                <button
                  onClick={() => {
                    setMode('admin_panel');
                    setAdminTab('setup');
                  }}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-xs transition shadow-lg flex items-center justify-center gap-2"
                >
                  Configurar nou sorteig <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <form onSubmit={handleLoginSubmit} className="space-y-5 text-center">
                <div>
                  <h2 className="text-lg font-bold text-white">Identificació</h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Introdueix el teu <span className="text-amber-400 font-semibold">PIN de 4 dígits</span> (o el PIN d'organitzador):
                  </p>
                </div>

                <div>
                  <input
                    type="password"
                    maxLength={10}
                    autoFocus
                    placeholder="••••"
                    value={loginInput}
                    onChange={(e) => setLoginInput(e.target.value)}
                    className="w-full max-w-[200px] mx-auto text-center text-3xl tracking-[0.4em] font-mono bg-slate-950 border-2 border-slate-700 rounded-2xl py-3 text-amber-400 placeholder-slate-700 focus:outline-none focus:border-emerald-500 transition block shadow-inner"
                  />
                </div>

                {loginError && (
                  <p className="text-xs text-rose-400 font-medium bg-rose-950/50 border border-rose-500/30 p-2.5 rounded-xl">
                    {loginError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={!loginInput.trim()}
                  className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-40 text-white font-bold rounded-xl shadow-lg transition text-sm flex items-center justify-center gap-2"
                >
                  <Unlock className="w-4 h-4" /> Entrar
                </button>

                {drawPayload.budget && (
                  <div className="pt-3 border-t border-slate-800 text-xs text-slate-400 flex justify-center gap-4">
                    <span>Presupost: <strong className="text-amber-400">{drawPayload.budget}</strong></span>
                    {drawPayload.date && <span>Data: <strong className="text-emerald-400">{drawPayload.date}</strong></span>}
                  </div>
                )}
              </form>
            )}
          </div>
        </main>

        <footer className="max-w-md mx-auto w-full text-center text-[11px] text-slate-600 pb-4">
          Sistema protegit per a famílies i grups d'amics 🎄
        </footer>
      </div>
    );
  }


  // =========================================================================
  // 2. PARTICIPANT VIEW (LOCKED TO INDIVIDUAL ASSIGNMENT & WISHLIST)
  // =========================================================================
  if (mode === 'participant_view' && currentGiver) {
    // Find recipient's live wishlist from drawPayload state
    const recipientName = currentGiver.recipient;
    const recipientWishlist = drawPayload.wishlists?.[recipientName] || [];
    const myWishlist = drawPayload.wishlists?.[currentGiver.giver] || [];

    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-emerald-500 selection:text-white pb-16">
        <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-50">
          <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="bg-gradient-to-tr from-emerald-600 to-teal-500 p-2 rounded-xl text-white shadow-md">
                <Gift className="w-5 h-5" />
              </div>
              <span className="font-bold text-lg text-emerald-100 tracking-tight">Amic Invisible</span>
            </div>

            <button
              onClick={handleLogout}
              className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg border border-slate-700 transition flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-400" />
              <span>Tancar Sessió</span>
            </button>
          </div>
        </header>

        <main className="max-w-xl mx-auto px-4 pt-8 space-y-6">
          {/* Top Session Pill */}
          <div className="flex items-center justify-between bg-slate-900 border border-slate-800 px-4 py-3 rounded-2xl">
            <span className="text-xs text-slate-300">
              Participant connectat: <strong className="text-emerald-400 font-semibold">{currentGiver.giver}</strong>
            </span>
          </div>

          {/* Secret Target Reveal Card with Recipient Wishlist inside */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl text-center space-y-6 relative overflow-hidden">
            <div className="inline-flex items-center space-x-2 bg-emerald-950 border border-emerald-500/30 text-emerald-300 text-xs font-semibold px-3 py-1 rounded-full">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Assignació Privada</span>
            </div>

            <h1 className="text-2xl font-extrabold text-white">
              Hola, <span className="text-emerald-400">{currentGiver.giver}</span>! 🎁
            </h1>

            <div className="my-4">
              {!isRevealed ? (
                <button
                  onClick={() => setIsRevealed(true)}
                  className="w-full py-8 px-4 bg-gradient-to-br from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-bold rounded-2xl shadow-xl border border-emerald-400/30 transition transform hover:-translate-y-0.5 active:translate-y-0 flex flex-col items-center justify-center space-y-2 group"
                >
                  <Eye className="w-8 h-8 text-emerald-200 group-hover:scale-110 transition-transform" />
                  <span className="text-base sm:text-lg">Prem per descobrir a qui has de regalar</span>
                  <span className="text-xs text-emerald-200/70 font-normal">PIN verificat amb èxit ✓</span>
                </button>
              ) : (
                <div className="p-6 bg-slate-950 border-2 border-emerald-500/50 rounded-2xl shadow-inner space-y-4 animate-in fade-in zoom-in-95 duration-300 text-left">
                  <div className="text-center">
                    <div className="text-xs text-slate-400 uppercase tracking-wider mb-1 font-medium">
                      El teu amic invisible és:
                    </div>
                    <div className="text-3xl sm:text-4xl font-black text-amber-400 my-2 drop-shadow">
                      🎁 {currentGiver.recipient} 🎁
                    </div>
                  </div>

                  {/* RECIPIENT SUGGESTIONS (WISHLIST) */}
                  <div className="mt-4 pt-4 border-t border-slate-800 space-y-2">
                    <h3 className="text-xs font-bold text-emerald-300 uppercase tracking-wide flex items-center gap-1.5">
                      <Heart className="w-3.5 h-3.5 text-rose-400" />
                      Suggeriments de regal de {currentGiver.recipient}:
                    </h3>
                    {recipientWishlist.length > 0 ? (
                      <ul className="space-y-1.5 bg-slate-900 border border-slate-800 p-3 rounded-xl">
                        {recipientWishlist.map((item, idx) => (
                          <li key={idx} className="text-xs text-slate-200 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-slate-500 italic bg-slate-900/50 p-3 rounded-xl text-center">
                        En/La {currentGiver.recipient} encara no ha afegit cap suggeriment de regal.
                      </p>
                    )}
                  </div>

                  <div className="text-center pt-2">
                    <button
                      onClick={() => setIsRevealed(false)}
                      className="text-xs text-slate-400 hover:text-slate-200 inline-flex items-center gap-1 underline underline-offset-4"
                    >
                      <EyeOff className="w-3.5 h-3.5" /> Amagar per seguretat
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Participant's Own Wishlist Box */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Heart className="w-5 h-5 text-rose-400" />
                <span>La meva llista de suggeriments</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Afegeix idees perquè la persona que et regala a tu ho tingui ben fàcil!
              </p>
            </div>

            <form onSubmit={handleAddWishItem} className="flex gap-2">
              <input
                type="text"
                placeholder="Ex: Llibre, mitjons calents..."
                value={newWishItem}
                onChange={(e) => setNewWishItem(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                type="submit"
                disabled={!newWishItem.trim()}
                className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium px-4 py-2 rounded-xl text-xs transition flex items-center gap-1 shrink-0"
              >
                <Plus className="w-4 h-4" /> Afegeix
              </button>
            </form>

            {myWishlist.length > 0 ? (
              <div className="space-y-2 pt-1">
                {myWishlist.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between bg-slate-950 border border-slate-800 px-3.5 py-2.5 rounded-xl text-xs text-slate-200"
                  >
                    <span>{item}</span>
                    <button
                      onClick={() => handleRemoveWishItem(idx)}
                      className="text-slate-600 hover:text-rose-400 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center py-4 text-slate-500 text-xs border border-dashed border-slate-800 rounded-xl">
                Encara no has afegit cap suggeriment.
              </p>
            )}
          </div>
        </main>
      </div>
    );
  }


  // =========================================================================
  // 3. ADMIN PANEL (ORGANITZADOR VIEW - SECURE)
  // =========================================================================
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-emerald-500 selection:text-white pb-16">
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-tr from-amber-500 to-amber-600 p-2.5 rounded-2xl shadow-lg text-slate-950 font-bold">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-white tracking-tight">Panell d'Organitzador</h1>
              <p className="text-xs text-slate-400">Àrea restringida i segura</p>
            </div>
          </div>

          <button
            onClick={() => setMode('login')}
            className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3.5 py-2 rounded-xl transition font-medium flex items-center gap-1.5 border border-slate-700"
          >
            <KeyRound className="w-4 h-4 text-amber-400" /> Sortir a Inici / Login
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 pt-8 space-y-6">
        {drawError && (
          <div className="bg-rose-950/80 border border-rose-500/50 text-rose-200 p-4 rounded-2xl text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{drawError}</span>
            </div>
            <button onClick={() => setDrawError('')} className="text-rose-400 hover:text-white">
              ✕
            </button>
          </div>
        )}

        {/* ADMIN TABS */}
        <div className="flex border-b border-slate-800 gap-4">
          <button
            onClick={() => setAdminTab('setup')}
            className={`pb-3 text-sm font-semibold border-b-2 transition ${
              adminTab === 'setup'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            1. Crear Participants i PIN d'Admin ({participants.length})
          </button>
          {drawPayload && (
            <button
              onClick={() => setAdminTab('results')}
              className={`pb-3 text-sm font-semibold border-b-2 transition ${
                adminTab === 'results'
                  ? 'border-emerald-500 text-emerald-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              2. Sorteig Actiu, Enllaços i Emergència
            </button>
          )}
        </div>

        {/* SETUP TAB */}
        {adminTab === 'setup' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1 space-y-6">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-4">
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-emerald-400" />
                  <span>Afegir Participant</span>
                </h3>

                {!showBulkInput ? (
                  <form onSubmit={handleAddParticipant} className="space-y-3">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Nom</label>
                      <input
                        type="text"
                        placeholder="Ex: Marta, Pau..."
                        value={nameInput}
                        onChange={(e) => setNameInput(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={!nameInput.trim()}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium py-2 rounded-xl text-xs transition"
                    >
                      Afegir participant
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowBulkInput(true)}
                      className="w-full text-xs text-slate-400 hover:text-slate-200 py-1 transition"
                    >
                      O enganxar llista de cop...
                    </button>
                  </form>
                ) : (
                  <div className="space-y-3">
                    <textarea
                      rows={4}
                      placeholder={"Laura\nMarc\nClara\nDavid"}
                      value={bulkInput}
                      onChange={(e) => setBulkInput(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleAddBulk}
                        disabled={!bulkInput.trim()}
                        className="flex-1 bg-emerald-600 text-white py-2 rounded-xl text-xs font-semibold"
                      >
                        Afegir tots
                      </button>
                      <button
                        onClick={() => setShowBulkInput(false)}
                        className="bg-slate-800 text-slate-300 px-3 py-2 rounded-xl text-xs"
                      >
                        Cancel·lar
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Admin Config Meta */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-3">
                <h3 className="font-bold text-white text-xs">Seguretat i Detalls</h3>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Contrasenya d'Organitzador</label>
                  <input
                    type="text"
                    value={adminPinInput}
                    onChange={(e) => setAdminPinInput(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-amber-400 font-mono font-bold"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">Amb aquest codi podràs accedir al panell d'admin.</p>
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Presupost límit</label>
                  <input
                    type="text"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Data</label>
                  <input
                    type="text"
                    placeholder="24 de Desembre"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white"
                  />
                </div>
              </div>
            </div>

            {/* Participants list & Generate */}
            <div className="md:col-span-2 space-y-6">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="font-bold text-white text-base">Llistat de Participants i PINs</h3>
                  <span className="text-xs text-emerald-400">{participants.length} persones</span>
                </div>

                {participants.length === 0 ? (
                  <div className="py-10 text-center text-slate-500 text-xs border border-dashed border-slate-800 rounded-2xl">
                    Afegeix almenys 3 participants per començar.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {participants.map((person, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between bg-slate-950 border border-slate-800 px-3.5 py-2.5 rounded-2xl text-xs"
                      >
                        <div className="space-y-0.5">
                          <span className="font-bold text-white block">{person.name}</span>
                          <span className="font-mono text-amber-400 text-[11px] flex items-center gap-1">
                            <KeyRound className="w-3 h-3" /> PIN: <strong>{person.pin}</strong>
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleRegeneratePin(idx)}
                            className="text-slate-500 hover:text-amber-400 p-1"
                            title="Regenerar PIN"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleRemoveParticipant(idx)}
                            className="text-slate-500 hover:text-rose-400 p-1"
                            title="Eliminar"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="pt-2">
                  <button
                    onClick={handleGenerateDraw}
                    disabled={participants.length < 3}
                    className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-40 text-white font-bold rounded-2xl shadow-lg transition text-sm flex items-center justify-center gap-2"
                  >
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>Realitzar el Sorteig Atzarós!</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* RESULTS & EMERGENCY RECOVERY TAB */}
        {adminTab === 'results' && drawPayload && (
          <div className="space-y-6">
            {/* Links Box */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Check className="w-5 h-5 text-emerald-400" />
                    <span>Sorteig actiu generat correctament!</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Comparteix l'enllaç general amb la família i dóna a cadascú el seu PIN de 4 dígits.
                  </p>
                </div>

                <button
                  onClick={copyMasterLink}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition flex items-center gap-2"
                >
                  {copiedMasterLink ? (
                    <>
                      <Check className="w-4 h-4" /> Enllaç Master Copiat!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" /> Copiar Enllaç General
                    </>
                  )}
                </button>
              </div>

              {/* EMERGENCY RECOVERY LINK SECTION */}
              <div className="bg-amber-950/20 border border-amber-500/30 p-4 rounded-2xl space-y-2">
                <div className="flex items-center gap-2 text-amber-400 text-xs font-bold">
                  <ShieldAlert className="w-4 h-4" />
                  <span>Enllaç d'Emergència de l'Organitzador (Guarda-te'l!)</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Si mai oblides la teva contrasenya d'administrador, guarda aquest enllaç privat. En clicar-lo, recuperaràs l'accés directe al panell d'organitzador a l'instant:
                </p>
                <div className="flex gap-2 pt-1">
                  <input
                    type="text"
                    readOnly
                    value={getEmergencyUrl()}
                    className="w-full bg-slate-950 border border-amber-500/30 rounded-xl px-3 py-2 text-[11px] text-amber-300 font-mono select-all"
                  />
                  <button
                    onClick={copyEmergencyLink}
                    className="bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold px-3 py-2 rounded-xl text-xs transition whitespace-nowrap"
                  >
                    {copiedEmergencyLink ? 'Desat!' : 'Copiar Emergència'}
                  </button>
                </div>
              </div>

              {/* Assignments Table (Admin view only) */}
              <div className="overflow-x-auto pt-2">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">
                  Assignacions Secretes (Només visible per a tu)
                </h4>
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider">
                      <th className="py-3 px-4">Participant</th>
                      <th className="py-3 px-4">Codi PIN Secret</th>
                      <th className="py-3 px-4">Regala a:</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {drawPayload.assignments.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-950/50">
                        <td className="py-3 px-4 font-bold text-white">{item.giver}</td>
                        <td className="py-3 px-4">
                          <span className="font-mono text-amber-400 bg-amber-950/50 border border-amber-500/30 px-2.5 py-1 rounded-lg font-bold">
                            {item.pin}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-emerald-400 font-semibold">
                          🎁 {item.recipient}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
