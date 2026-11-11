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
  Share2,
  Calendar,
  Heart,
  Plus,
  ArrowRight,
  LogOut
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

// Helper to generate a random 4-digit PIN string
const generatePin = () => {
  return Math.floor(1000 + Math.random() * 9000).toString();
};

export default function App() {
  // Global App State (decoded from URL hash if present)
  const [drawPayload, setDrawPayload] = useState(null); // { assignments: [{ giver, pin, recipient }], budget, date }
  
  // Navigation State
  const [mode, setMode] = useState('participant'); // 'participant' | 'admin'
  const [adminTab, setAdminTab] = useState('setup'); // 'setup' | 'results'

  // Admin Form State
  const [nameInput, setNameInput] = useState('');
  const [bulkInput, setBulkInput] = useState('');
  const [showBulkInput, setShowBulkInput] = useState(false);
  const [participants, setParticipants] = useState([]); // [{ name, pin }]
  const [budget, setBudget] = useState('20€');
  const [eventDate, setEventDate] = useState('');
  const [drawError, setDrawError] = useState('');
  const [copiedMasterLink, setCopiedMasterLink] = useState(false);

  // Participant Login & Reveal State
  const [enteredPin, setEnteredPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [currentGiver, setCurrentGiver] = useState(null); // Logged in participant object
  const [isRevealed, setIsRevealed] = useState(false);

  // Participant Wishlist State
  const [myWishlist, setMyWishlist] = useState([]);
  const [newWishItem, setNewWishItem] = useState('');

  // Listen for Hash Changes (When loading or sharing master URL)
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash && hash.startsWith('#data=')) {
        const encoded = hash.replace('#data=', '');
        const decoded = decodeData(encoded);
        if (decoded && decoded.assignments && Array.isArray(decoded.assignments)) {
          setDrawPayload(decoded);
          setMode('participant');
        }
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // --- ADMIN HANDLERS ---
  const handleAddParticipant = (e) => {
    e?.preventDefault();
    const trimmed = nameInput.trim();
    if (!trimmed) return;
    if (participants.some(p => p.name.toLowerCase() === trimmed.toLowerCase())) {
      setDrawError(`El nom "${trimmed}" ja està a la llista.`);
      return;
    }
    setParticipants([...participants, { name: trimmed, pin: generatePin() }]);
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
        newItems.push({ name: n, pin: generatePin() });
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
    updated[index].pin = generatePin();
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

    // Shuffle until no participant receives themselves
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

    const payload = {
      assignments,
      budget: budget || '20€',
      date: eventDate || ''
    };

    setDrawPayload(payload);
    
    // Automatically update URL hash with newly drawn master payload
    const encoded = encodeData(payload);
    window.location.hash = `data=${encoded}`;
    
    setAdminTab('results');
  };

  const getMasterUrl = () => {
    if (!drawPayload) return window.location.origin + window.location.pathname;
    const baseUrl = window.location.origin + window.location.pathname;
    const encoded = encodeData(drawPayload);
    return `${baseUrl}#data=${encoded}`;
  };

  const copyMasterLink = () => {
    const url = getMasterUrl();
    navigator.clipboard.writeText(url);
    setCopiedMasterLink(true);
    setTimeout(() => setCopiedMasterLink(false), 2500);
  };

  // --- PARTICIPANT PIN VERIFICATION ---
  const handlePinSubmit = (e) => {
    e?.preventDefault();
    setPinError('');

    if (!drawPayload || !drawPayload.assignments) {
      setPinError('Encara no hi ha cap sorteig actiu. Demana l\'enllaç a l\'organitzador.');
      return;
    }

    const match = drawPayload.assignments.find(a => a.pin === enteredPin.trim());
    if (match) {
      setCurrentGiver(match);
      setIsRevealed(false);

      // Load participant wishlist from local storage if existing
      const saved = localStorage.getItem(`amic_invisible_wishlist_${match.giver}`);
      if (saved) {
        try {
          setMyWishlist(JSON.parse(saved));
        } catch (err) {}
      } else {
        setMyWishlist([]);
      }
    } else {
      setPinError('Codi secret incorrecte! Revisa els 4 dígits i torna-ho a provar.');
    }
  };

  const handleLogout = () => {
    setCurrentGiver(null);
    setEnteredPin('');
    setIsRevealed(false);
    setPinError('');
  };

  // Wishlist addition
  const handleAddWishItem = (e) => {
    e?.preventDefault();
    if (!newWishItem.trim() || !currentGiver) return;
    const updated = [...myWishlist, newWishItem.trim()];
    setMyWishlist(updated);
    setNewWishItem('');
    localStorage.setItem(`amic_invisible_wishlist_${currentGiver.giver}`, JSON.stringify(updated));
  };

  const handleRemoveWishItem = (index) => {
    if (!currentGiver) return;
    const updated = myWishlist.filter((_, i) => i !== index);
    setMyWishlist(updated);
    localStorage.setItem(`amic_invisible_wishlist_${currentGiver.giver}`, JSON.stringify(updated));
  };

  // =========================================================================
  // RENDER PARTICIPANT VIEW (DEFAULT FAMÍLIA VIEW)
  // =========================================================================
  if (mode === 'participant') {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-emerald-500 selection:text-white pb-16">
        {/* Header */}
        <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-50">
          <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="bg-gradient-to-tr from-emerald-600 to-teal-500 p-2 rounded-xl text-white shadow-md">
                <Gift className="w-5 h-5" />
              </div>
              <span className="font-bold text-lg text-emerald-100 tracking-tight">Amic Invisible</span>
            </div>

            <button
              onClick={() => setMode('admin')}
              className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg border border-slate-700 transition flex items-center gap-1.5"
            >
              <KeyRound className="w-3.5 h-3.5 text-amber-400" />
              <span>Mode Organitzador</span>
            </button>
          </div>
        </header>

        <main className="max-w-xl mx-auto px-4 pt-8 space-y-6">
          {!drawPayload ? (
            /* No Draw Payload Active */
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-4">
              <div className="w-12 h-12 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-2xl flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-white">Cap sorteig carregat</h2>
              <p className="text-xs text-slate-400 leading-relaxed max-w-sm mx-auto">
                Encara no s'ha carregat cap sorteig d'Amic Invisible en aquest enllaç. 
                Demanali l'enllaç del sorteig a l'organitzador o entra al Mode Organitzador per crear-ne un de nou!
              </p>
              <button
                onClick={() => setMode('admin')}
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition inline-flex items-center gap-2"
              >
                Crear nou sorteig ara <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : !currentGiver ? (
            /* PIN ENTRY SCREEN */
            <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden text-center space-y-6">
              <div className="absolute -top-10 -right-10 w-28 h-28 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

              <div className="w-14 h-14 bg-gradient-to-tr from-emerald-600 to-teal-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-emerald-950/60 text-white">
                <Lock className="w-7 h-7" />
              </div>

              <div>
                <h1 className="text-2xl font-extrabold text-white">Benvingut/da al Sorteig! 🎄</h1>
                <p className="text-xs text-slate-400 mt-2">
                  Introdueix el teu <span className="text-amber-400 font-semibold">Codi Secret de 4 dígits</span> per descobrir a qui has de regalar.
                </p>
              </div>

              {/* Event details pill */}
              {(drawPayload.budget || drawPayload.date) && (
                <div className="flex flex-wrap justify-center gap-2 text-xs">
                  {drawPayload.budget && (
                    <span className="bg-slate-950 border border-slate-800 px-3 py-1 rounded-lg text-slate-300">
                      Presupost: <strong className="text-amber-400">{drawPayload.budget}</strong>
                    </span>
                  )}
                  {drawPayload.date && (
                    <span className="bg-slate-950 border border-slate-800 px-3 py-1 rounded-lg text-slate-300 flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-emerald-400" /> {drawPayload.date}
                    </span>
                  )}
                </div>
              )}

              {/* PIN Form */}
              <form onSubmit={handlePinSubmit} className="space-y-4 max-w-xs mx-auto">
                <div>
                  <input
                    type="password"
                    maxLength={4}
                    pattern="[0-9]*"
                    inputMode="numeric"
                    placeholder="• • • •"
                    value={enteredPin}
                    onChange={(e) => setEnteredPin(e.target.value)}
                    className="w-full text-center text-3xl tracking-[0.5em] font-mono bg-slate-950 border-2 border-slate-700 rounded-2xl py-3 text-emerald-400 placeholder-slate-700 focus:outline-none focus:border-emerald-500 transition"
                  />
                </div>

                {pinError && (
                  <p className="text-xs text-rose-400 font-medium bg-rose-950/50 border border-rose-500/30 p-2.5 rounded-xl">
                    {pinError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={enteredPin.length !== 4}
                  className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-40 text-white font-bold rounded-xl shadow-lg transition text-sm flex items-center justify-center gap-2"
                >
                  <Unlock className="w-4 h-4" /> Entrar al meu regal
                </button>
              </form>
            </div>
          ) : (
            /* REVEALED CARD SCREEN FOR LOGGED IN PARTICIPANT */
            <div className="space-y-6">
              {/* Top Logout bar */}
              <div className="flex items-center justify-between bg-slate-900 border border-slate-800 px-4 py-3 rounded-2xl">
                <span className="text-xs text-slate-300">
                  Sessió: <strong className="text-emerald-400 font-semibold">{currentGiver.giver}</strong>
                </span>
                <button
                  onClick={handleLogout}
                  className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition"
                >
                  <LogOut className="w-3.5 h-3.5" /> Sortir / Tancar
                </button>
              </div>

              {/* Secret Target Reveal Card */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl text-center space-y-6 relative overflow-hidden">
                <div className="inline-flex items-center space-x-2 bg-emerald-950 border border-emerald-500/30 text-emerald-300 text-xs font-semibold px-3 py-1 rounded-full">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Assignació Privada</span>
                </div>

                <h1 className="text-2xl font-extrabold text-white">
                  Hola, <span className="text-emerald-400">{currentGiver.giver}</span>! 🎁
                </h1>

                <div className="my-6">
                  {!isRevealed ? (
                    <button
                      onClick={() => setIsRevealed(true)}
                      className="w-full py-8 px-4 bg-gradient-to-br from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-bold rounded-2xl shadow-xl border border-emerald-400/30 transition transform hover:-translate-y-0.5 active:translate-y-0 flex flex-col items-center justify-center space-y-2 group"
                    >
                      <Eye className="w-8 h-8 text-emerald-200 group-hover:scale-110 transition-transform" />
                      <span className="text-base sm:text-lg">Prem per veure a qui has de regalar</span>
                      <span className="text-xs text-emerald-200/70 font-normal">Codi PIN comprovat correctament ✓</span>
                    </button>
                  ) : (
                    <div className="p-6 bg-slate-950 border-2 border-emerald-500/50 rounded-2xl shadow-inner animate-in fade-in zoom-in-95 duration-300">
                      <div className="text-xs text-slate-400 uppercase tracking-wider mb-2 font-medium">
                        El teu amic invisible és:
                      </div>
                      <div className="text-3xl sm:text-4xl font-black text-amber-400 my-2 drop-shadow">
                        🎁 {currentGiver.recipient} 🎁
                      </div>
                      <button
                        onClick={() => setIsRevealed(false)}
                        className="mt-4 text-xs text-slate-400 hover:text-slate-200 inline-flex items-center gap-1 underline underline-offset-4"
                      >
                        <EyeOff className="w-3.5 h-3.5" /> Amagar per seguretat
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Wishlist Box */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <Heart className="w-5 h-5 text-rose-400" />
                    <span>La meva llista de suggeriments per al meu regal</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Afegeix idees perquè qui et regali a tu encerti de ple!
                  </p>
                </div>

                <form onSubmit={handleAddWishItem} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Ex: Llibre, mitjons calents, llibreta..."
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
            </div>
          )}
        </main>
      </div>
    );
  }

  // =========================================================================
  // RENDER ADMIN VIEW (ORGANITZADOR)
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
              <p className="text-xs text-slate-400">Gestió de Codis secrets PIN</p>
            </div>
          </div>

          <button
            onClick={() => setMode('participant')}
            className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2 rounded-xl transition font-medium flex items-center gap-1.5"
          >
            <Gift className="w-4 h-4" /> Vista Participants
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

        {/* ADMIN TAB SELECTOR */}
        <div className="flex border-b border-slate-800 gap-4">
          <button
            onClick={() => setAdminTab('setup')}
            className={`pb-3 text-sm font-semibold border-b-2 transition ${
              adminTab === 'setup'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            1. Crear Participants i Codis PIN ({participants.length})
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
              2. Sorteig Actiu i Llista de PINs
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
                  <span>Afegir Persona</span>
                </h3>

                {!showBulkInput ? (
                  <form onSubmit={handleAddParticipant} className="space-y-3">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Nom del participant</label>
                      <input
                        type="text"
                        placeholder="Ex: Marta, Pau, Avi..."
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
                      O afegir molts noms de cop...
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

              {/* Event Meta */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-3">
                <h3 className="font-bold text-white text-xs">Detalls opcionals</h3>
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
                  <label className="block text-[11px] text-slate-400 mb-1">Data de celebració</label>
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

            {/* List and Generate */}
            <div className="md:col-span-2 space-y-6">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <h3 className="font-bold text-white text-base">Participants i Codis Secret PIN</h3>
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

        {/* RESULTS & PIN TABLE TAB */}
        {adminTab === 'results' && drawPayload && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Check className="w-5 h-5 text-emerald-400" />
                  <span>Sorteig actiu generat!</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Envia l'enllaç únic master a tota la família i entrega a cadascú el seu PIN de 4 dígits.
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
                    <Copy className="w-4 h-4" /> Copiar Enllaç Únic per a Tots
                  </>
                )}
              </button>
            </div>

            {/* Master Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-4">Participant</th>
                    <th className="py-3 px-4">Codi PIN Secret</th>
                    <th className="py-3 px-4">Assignat a (Només visible per Admin)</th>
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
                      <td className="py-3 px-4 text-slate-500 italic">
                        {item.recipient}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
