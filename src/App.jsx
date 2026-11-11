import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Gift, UserPlus, Trash2, Copy, Check, Sparkles, Eye, EyeOff, 
  RefreshCw, Unlock, KeyRound, ShieldCheck, AlertCircle, 
  Heart, Plus, ArrowRight, LogOut, ShieldAlert, Loader2
} from 'lucide-react';

// --- SUPABASE CONFIGURATION ---
const SUPABASE_URL = 'YOUR_SUPABASE_URL'; // Paste your Project URL here
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY'; // Paste your anon public key here
const DRAW_ID = 'familia-2026'; // Unique ID for your family's draw in the 'draws' table

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default function App() {
  // Database State
  const [drawData, setDrawData] = useState(null); // Row from 'draws' table
  const [dbParticipants, setDbParticipants] = useState([]); // Rows from 'participants' table
  const [recipientWishlist, setRecipientWishlist] = useState([]); // Rows from 'wishlist_items' for target
  const [myWishlist, setMyWishlist] = useState([]); // Rows from 'wishlist_items' for logged-in user
  const [isLoading, setIsLoading] = useState(true);

  // Navigation / Login State
  const [mode, setMode] = useState('login'); // 'login' | 'participant_view' | 'admin_panel'
  const [adminTab, setAdminTab] = useState('setup'); // 'setup' | 'results'

  // Login Form State
  const [loginInput, setLoginInput] = useState('');
  const [loginError, setLoginError] = useState('');

  // Admin Setup State
  const [nameInput, setNameInput] = useState('');
  const [bulkInput, setBulkInput] = useState('');
  const [showBulkInput, setShowBulkInput] = useState(false);
  const [setupParticipants, setSetupParticipants] = useState([]); // [{ name, pin }]
  const [adminPinInput, setAdminPinInput] = useState('1234');
  const [budget, setBudget] = useState('20€');
  const [eventDate, setEventDate] = useState('');
  const [drawError, setDrawError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [copiedMasterLink, setCopiedMasterLink] = useState(false);
  const [copiedEmergencyLink, setCopiedEmergencyLink] = useState(false);

  // Participant View State
  const [currentGiver, setCurrentGiver] = useState(null); // Row from 'participants'
  const [isRevealed, setIsRevealed] = useState(false);
  const [newWishItem, setNewWishItem] = useState('');

  // Load initial data from Supabase & check Emergency Token
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch draw config
      const { data: draw } = await supabase
        .from('draws')
        .select('*')
        .eq('id', DRAW_ID)
        .single();

      if (draw) {
        setDrawData(draw);

        // 2. Fetch all participants for this draw
        const { data: parts } = await supabase
          .from('participants')
          .select('*')
          .eq('draw_id', DRAW_ID);

        if (parts) setDbParticipants(parts);

        // 3. Check Emergency Admin URL parameter (?admin=TOKEN)
        const params = new URLSearchParams(window.location.search);
        const emergencyParam = params.get('admin');
        if (emergencyParam && draw.emergency_token && emergencyParam === draw.emergency_token) {
          setMode('admin_panel');
          setAdminTab('results');
        }
      }
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch wishlists when a participant logs in
  const loadWishlistsForUser = async (participant, allParticipants) => {
    // 1. Load my own wishlist items
    const { data: mine } = await supabase
      .from('wishlist_items')
      .select('*')
      .eq('participant_id', participant.id);
    setMyWishlist(mine || []);

    // 2. Find my recipient's participant ID and load their wishlist items
    const recipientObj = allParticipants.find(p => p.name === participant.recipient_name);
    if (recipientObj) {
      const { data: theirs } = await supabase
        .from('wishlist_items')
        .select('*')
        .eq('participant_id', recipientObj.id);
      setRecipientWishlist(theirs || []);
    } else {
      setRecipientWishlist([]);
    }
  };

  // --- ADMIN SETUP HANDLERS ---
  const handleAddParticipant = (e) => {
    e?.preventDefault();
    const trimmed = nameInput.trim();
    if (!trimmed) return;
    if (setupParticipants.some(p => p.name.toLowerCase() === trimmed.toLowerCase())) {
      setDrawError(`El nom "${trimmed}" ja està a la llista.`);
      return;
    }
    const pin = Math.floor(1000 + Math.random() * 9000).toString();
    setSetupParticipants([...setupParticipants, { name: trimmed, pin }]);
    setNameInput('');
    setDrawError('');
  };

  const handleAddBulk = () => {
    const names = bulkInput.split(/[\n,]+/).map(n => n.trim()).filter(n => n.length > 0);
    const existingNames = setupParticipants.map(p => p.name.toLowerCase());
    const newItems = [];
    
    names.forEach(n => {
      if (!existingNames.includes(n.toLowerCase())) {
        newItems.push({ name: n, pin: Math.floor(1000 + Math.random() * 9000).toString() });
        existingNames.push(n.toLowerCase());
      }
    });

    setSetupParticipants([...setupParticipants, ...newItems]);
    setBulkInput('');
    setShowBulkInput(false);
    setDrawError('');
  };

  const handleRemoveParticipant = (index) => {
    setSetupParticipants(setupParticipants.filter((_, i) => i !== index));
  };

  const handleRegeneratePin = (index) => {
    const updated = [...setupParticipants];
    updated[index].pin = Math.floor(1000 + Math.random() * 9000).toString();
    setSetupParticipants(updated);
  };

  const handleGenerateDraw = async () => {
    if (setupParticipants.length < 3) {
      setDrawError('Es necessiten almenys 3 participants per fer el sorteig!');
      return;
    }
    setDrawError('');
    setIsSaving(true);

    const givers = [...setupParticipants];
    let receivers = [...setupParticipants];
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
      setDrawError('Error generant el sorteig. Torna-ho a intentar.');
      setIsSaving(false);
      return;
    }

    const emergencyToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const newDraw = {
      id: DRAW_ID,
      admin_pin: adminPinInput.trim() || '1234',
      emergency_token: emergencyToken,
      budget: budget || '20€',
      event_date: eventDate || ''
    };

    try {
      // 1. Clean up old data if re-running draw
      await supabase.from('participants').delete().eq('draw_id', DRAW_ID);

      // 2. Save Draw record
      const { error: drawErr } = await supabase.from('draws').upsert(newDraw);
      if (drawErr) throw drawErr;

      // 3. Insert Participant records
      const participantRows = givers.map((giver, idx) => ({
        draw_id: DRAW_ID,
        name: giver.name,
        pin: giver.pin,
        recipient_name: receivers[idx].name
      }));

      const { data: insertedParts, error: partErr } = await supabase
        .from('participants')
        .insert(participantRows)
        .select();

      if (partErr) throw partErr;

      setDrawData(newDraw);
      setDbParticipants(insertedParts || []);
      setAdminTab('results');
    } catch (err) {
      console.error(err);
      setDrawError('Error guardant a Supabase. Revisa les taules i permisos (RLS).');
    } finally {
      setIsSaving(false);
    }
  };

  // --- URL HELPERS ---
  const getMasterUrl = () => window.location.origin + window.location.pathname;
  const getEmergencyUrl = () => drawData?.emergency_token 
    ? `${window.location.origin}${window.location.pathname}?admin=${drawData.emergency_token}` 
    : '';

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

  // --- LOGIN HANDLER ---
  const handleLoginSubmit = async (e) => {
    e?.preventDefault();
    setLoginError('');
    const input = loginInput.trim();
    if (!input) return;

    if (!drawData) {
      setLoginError("Encara no s'ha configurat cap sorteig.");
      return;
    }

    // 1. Admin login check
    if (input === drawData.admin_pin) {
      setMode('admin_panel');
      setAdminTab('results');
      setLoginInput('');
      return;
    }

    // 2. Participant PIN check
    const match = dbParticipants.find(p => p.pin === input);
    if (match) {
      setIsLoading(true);
      await loadWishlistsForUser(match, dbParticipants);
      setCurrentGiver(match);
      setMode('participant_view');
      setIsRevealed(false);
      setLoginInput('');
      setIsLoading(false);
    } else {
      setLoginError('Codi PIN o contrasenya incorrectes.');
    }
  };

  const handleLogout = () => {
    setCurrentGiver(null);
    setLoginInput('');
    setIsRevealed(false);
    setLoginError('');
    setMode('login');
  };

  // --- WISHLIST HANDLERS (Relational table: wishlist_items) ---
  const handleAddWishItem = async (e) => {
    e?.preventDefault();
    if (!newWishItem.trim() || !currentGiver) return;

    const { data, error } = await supabase
      .from('wishlist_items')
      .insert({ participant_id: currentGiver.id, item_text: newWishItem.trim() })
      .select()
      .single();

    if (!error && data) {
      setMyWishlist([...myWishlist, data]);
      setNewWishItem('');
    }
  };

  const handleRemoveWishItem = async (itemId) => {
    const { error } = await supabase
      .from('wishlist_items')
      .delete()
      .eq('id', itemId);

    if (!error) {
      setMyWishlist(myWishlist.filter(item => item.id !== itemId));
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-emerald-400 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="text-xs text-slate-400">Connectant amb la base de dades...</span>
      </div>
    );
  }

  // =========================================================================
  // 1. LOGIN SCREEN
  // =========================================================================
  if (mode === 'login') {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col justify-between p-4">
        <header className="max-w-md mx-auto w-full pt-8 text-center">
          <div className="inline-flex items-center justify-center p-3 bg-emerald-950 border border-emerald-500/30 rounded-2xl mb-3 shadow-lg text-emerald-400">
            <Gift className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Amic Invisible Secret</h1>
          <p className="text-xs text-slate-400 mt-1">Accés segur amb codi PIN personalitzat</p>
        </header>

        <main className="max-w-md mx-auto w-full px-2">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
            {!drawData ? (
              <div className="text-center space-y-4 py-4">
                <div className="w-12 h-12 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-2xl flex items-center justify-center mx-auto">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <h2 className="text-lg font-bold text-white">Cap sorteig actiu</h2>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Si ets l'organitzador i vols configurar el sorteig des de zero, fes clic aquí:
                </p>
                <button
                  onClick={() => { setMode('admin_panel'); setAdminTab('setup'); }}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-xs transition flex items-center justify-center gap-2"
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

                <input
                  type="password"
                  maxLength={10}
                  autoFocus
                  placeholder="••••"
                  value={loginInput}
                  onChange={(e) => setLoginInput(e.target.value)}
                  className="w-full max-w-[200px] mx-auto text-center text-3xl tracking-[0.4em] font-mono bg-slate-950 border-2 border-slate-700 rounded-2xl py-3 text-amber-400 placeholder-slate-700 focus:outline-none focus:border-emerald-500 transition block"
                />

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

                {drawData.budget && (
                  <div className="pt-3 border-t border-slate-800 text-xs text-slate-400 flex justify-center gap-4">
                    <span>Presupost: <strong className="text-amber-400">{drawData.budget}</strong></span>
                    {drawData.event_date && <span>Data: <strong className="text-emerald-400">{drawData.event_date}</strong></span>}
                  </div>
                )}
              </form>
            )}
          </div>
        </main>

        <footer className="max-w-md mx-auto w-full text-center text-[11px] text-slate-600 pb-4">
          Sincronitzat al núvol amb Supabase 🎄
        </footer>
      </div>
    );
  }

  // =========================================================================
  // 2. PARTICIPANT VIEW
  // =========================================================================
  if (mode === 'participant_view' && currentGiver) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-16">
        <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-50">
          <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="bg-gradient-to-tr from-emerald-600 to-teal-500 p-2 rounded-xl text-white">
                <Gift className="w-5 h-5" />
              </div>
              <span className="font-bold text-lg text-emerald-100">Amic Invisible</span>
            </div>
            <button
              onClick={handleLogout}
              className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg border border-slate-700 flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5 text-rose-400" />
              <span>Tancar Sessió</span>
            </button>
          </div>
        </header>

        <main className="max-w-xl mx-auto px-4 pt-8 space-y-6">
          <div className="bg-slate-900 border border-slate-800 px-4 py-3 rounded-2xl text-xs text-slate-300">
            Participant connectat: <strong className="text-emerald-400">{currentGiver.name}</strong>
          </div>

          {/* Secret Reveal Card */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl text-center space-y-6">
            <div className="inline-flex items-center space-x-2 bg-emerald-950 border border-emerald-500/30 text-emerald-300 text-xs font-semibold px-3 py-1 rounded-full">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Assignació Privada</span>
            </div>

            <h1 className="text-2xl font-extrabold text-white">
              Hola, <span className="text-emerald-400">{currentGiver.name}</span>! 🎁
            </h1>

            <div className="my-4">
              {!isRevealed ? (
                <button
                  onClick={() => setIsRevealed(true)}
                  className="w-full py-8 px-4 bg-gradient-to-br from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 text-white font-bold rounded-2xl shadow-xl border border-emerald-400/30 flex flex-col items-center justify-center space-y-2"
                >
                  <Eye className="w-8 h-8 text-emerald-200" />
                  <span className="text-base sm:text-lg">Prem per descobrir a qui has de regalar</span>
                </button>
              ) : (
                <div className="p-6 bg-slate-950 border-2 border-emerald-500/50 rounded-2xl space-y-4 text-left">
                  <div className="text-center">
                    <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">El teu amic invisible és:</div>
                    <div className="text-3xl sm:text-4xl font-black text-amber-400 my-2">
                      🎁 {currentGiver.recipient_name} 🎁
                    </div>
                  </div>

                  {/* Recipient's Live Wishlist from Database */}
                  <div className="mt-4 pt-4 border-t border-slate-800 space-y-2">
                    <h3 className="text-xs font-bold text-emerald-300 uppercase tracking-wide flex items-center gap-1.5">
                      <Heart className="w-3.5 h-3.5 text-rose-400" />
                      Suggeriments de regal de {currentGiver.recipient_name}:
                    </h3>
                    {recipientWishlist.length > 0 ? (
                      <ul className="space-y-1.5 bg-slate-900 border border-slate-800 p-3 rounded-xl">
                        {recipientWishlist.map((item) => (
                          <li key={item.id} className="text-xs text-slate-200 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                            {item.item_text}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-slate-500 italic bg-slate-900/50 p-3 rounded-xl text-center">
                        Encara no ha afegit cap suggeriment de regal.
                      </p>
                    )}
                  </div>

                  <div className="text-center pt-2">
                    <button
                      onClick={() => setIsRevealed(false)}
                      className="text-xs text-slate-400 hover:text-slate-200 inline-flex items-center gap-1 underline"
                    >
                      <EyeOff className="w-3.5 h-3.5" /> Amagar per seguretat
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* My Own Wishlist Box */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Heart className="w-5 h-5 text-rose-400" />
                <span>La meva llista de suggeriments</span>
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Es guarda al núvol perquè qui et regali ho vegi a l'instant!
              </p>
            </div>

            <form onSubmit={handleAddWishItem} className="flex gap-2">
              <input
                type="text"
                placeholder="Ex: Llibre, mitjons calents..."
                value={newWishItem}
                onChange={(e) => setNewWishItem(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                type="submit"
                disabled={!newWishItem.trim()}
                className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium px-4 py-2 rounded-xl text-xs flex items-center gap-1"
              >
                <Plus className="w-4 h-4" /> Afegeix
              </button>
            </form>

            {myWishlist.length > 0 ? (
              <div className="space-y-2 pt-1">
                {myWishlist.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between bg-slate-950 border border-slate-800 px-3.5 py-2.5 rounded-xl text-xs text-slate-200"
                  >
                    <span>{item.item_text}</span>
                    <button
                      onClick={() => handleRemoveWishItem(item.id)}
                      className="text-slate-600 hover:text-rose-400"
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
  // 3. ADMIN PANEL
  // =========================================================================
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-16">
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-tr from-amber-500 to-amber-600 p-2.5 rounded-2xl text-slate-950 font-bold">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-white">Panell d'Organitzador</h1>
              <p className="text-xs text-slate-400">Àrea restringida</p>
            </div>
          </div>

          <button
            onClick={() => setMode('login')}
            className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3.5 py-2 rounded-xl flex items-center gap-1.5 border border-slate-700"
          >
            <KeyRound className="w-4 h-4 text-amber-400" /> Sortir a Inici / Login
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 pt-8 space-y-6">
        {drawError && (
          <div className="bg-rose-950/80 border border-rose-500/50 text-rose-200 p-4 rounded-2xl text-xs flex items-center justify-between">
            <span>{drawError}</span>
            <button onClick={() => setDrawError('')}>✕</button>
          </div>
        )}

        <div className="flex border-b border-slate-800 gap-4">
          <button
            onClick={() => setAdminTab('setup')}
            className={`pb-3 text-sm font-semibold border-b-2 ${
              adminTab === 'setup' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-slate-400'
            }`}
          >
            1. Nou Sorteig ({setupParticipants.length})
          </button>
          {drawData && (
            <button
              onClick={() => setAdminTab('results')}
              className={`pb-3 text-sm font-semibold border-b-2 ${
