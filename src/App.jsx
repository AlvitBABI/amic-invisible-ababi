import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Gift, UserPlus, Trash2, Copy, Check, Sparkles, Eye, EyeOff, 
  RefreshCw, Unlock, KeyRound, ShieldCheck, AlertCircle, 
  Heart, Plus, LogOut, ShieldAlert, Loader2, PlusCircle, Settings
} from 'lucide-react';

// --- SUPABASE CONFIGURATION ---
const SUPABASE_URL = 'https://wxtmedefbfsklfcqeuna.supabase.co'; 
const SUPABASE_ANON_KEY = 'sb_publishable__WbCTrsXTmcrpDurJx5mXQ_MaEE6v6u'; 

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default function App() {
  // Database State
  const [drawData, setDrawData] = useState(null); // Row from 'draws' table
  const [dbParticipants, setDbParticipants] = useState([]); // Rows from 'participants' table
  const [recipientWishlist, setRecipientWishlist] = useState([]); // Rows from 'wishlist_items'
  const [myWishlist, setMyWishlist] = useState([]); // Rows from 'wishlist_items'
  const [isLoading, setIsLoading] = useState(true);

  // Navigation / Login State
  const [mode, setMode] = useState('login'); // 'login' | 'participant_view' | 'admin_panel'
  const [adminTab, setAdminTab] = useState('setup'); // 'setup' | 'results' | 'settings'

  // Login Form State
  const [loginInput, setLoginInput] = useState('');
  const [loginError, setLoginError] = useState('');

  // Admin Setup & Edit State
  const [drawSlugInput, setDrawSlugInput] = useState('familia-2026'); // Unique slug identifier
  const [nameInput, setNameInput] = useState('');
  const [bulkInput, setBulkInput] = useState('');
  const [showBulkInput, setShowBulkInput] = useState(false);
  const [setupParticipants, setSetupParticipants] = useState([]); // [{ name, pin }]
  const [adminPinInput, setAdminPinInput] = useState('1234');
  const [budget, setBudget] = useState('30€');
  const [eventDate, setEventDate] = useState('');
  const [drawError, setDrawError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [copiedMasterLink, setCopiedMasterLink] = useState(false);
  const [copiedEmergencyLink, setCopiedEmergencyLink] = useState(false);

  // Participant View State
  const [currentGiver, setCurrentGiver] = useState(null);
  const [isRevealed, setIsRevealed] = useState(false);
  const [newWishItem, setNewWishItem] = useState('');

  // Load draw based on URL parameter (e.g. ?draw=familia-2026) on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const drawSlug = params.get('draw');
    if (drawSlug) {
      loadDrawBySlug(drawSlug);
    } else {
      setIsLoading(false);
    }
  }, []);

  const loadDrawBySlug = async (slug) => {
    setIsLoading(true);
    try {
      // 1. Fetch draw config by slug field[cite: 1]
      const { data: draw, error } = await supabase
        .from('draws')
        .select('*')
        .eq('slug', slug)
        .single();

      if (draw) {
        setDrawData(draw);
        setDrawSlugInput(draw.slug);
        setAdminPinInput(draw.admin_pin || '1234');
        setBudget(draw.budget || '');
        setEventDate(draw.event_date || '');

        // 2. Fetch participants linked via draw_slug (text)
        const { data: parts } = await supabase
          .from('participants')
          .select('*')
          .eq('draw_slug', draw.slug);

        if (parts) setDbParticipants(parts);

        // 3. Check Emergency Admin URL parameter (?admin=TOKEN)
        const params = new URLSearchParams(window.location.search);
        const emergencyParam = params.get('admin');
        if (emergencyParam && draw.emergency_token && emergencyParam === draw.emergency_token) {
          setMode('admin_panel');
          setAdminTab(parts && parts.length > 0 ? 'results' : 'setup');
        }
      } else {
        setDrawError("No s'ha trobat cap sorteig amb aquest identificador.");
      }
    } catch (err) {
      console.error('Error loading draw:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadWishlistsForUser = async (participant, allParticipants) => {
    const { data: mine } = await supabase
      .from('wishlist_items')
      .select('*')
      .eq('participant_id', participant.id);
    setMyWishlist(mine || []);

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

  // --- STRICT PAIRING ALGORITHM (No Mutual Gifting & No Self Gifting) ---
  const generateValidAssignments = (participantsList) => {
    const givers = [...participantsList];
    let receivers = [...participantsList];
    let valid = false;
    let attempts = 0;

    while (!valid && attempts < 1000) {
      attempts++;
      // Shuffle receivers
      for (let i = receivers.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [receivers[i], receivers[j]] = [receivers[j], receivers[i]];
      }

      // Check conditions:
      // 1. No one gives to themselves (giver.name !== receiver.name)
      // 2. No mutual gifting: if A gives to B, then B MUST NOT give to A
      valid = givers.every((giver, idx) => {
        const receiver = receivers[idx];
        if (giver.name === receiver.name) return false;

        // Find what receiver is giving to
        const receiverTargetIdx = receivers.findIndex(r => r.name === receiver.name);
        // Wait, check who receiver gives to: look up receiver's assigned index
        // Let's map it cleanly:
      });

      if (valid) break;

      // Cleaner validation loop:
      let mapping = {};
      givers.forEach((g, idx) => {
        mapping[g.name] = receivers[idx].name;
      });

      let hasSelf = false;
      let hasMutual = false;

      for (let giverName in mapping) {
        let receiverName = mapping[giverName];
        if (giverName === receiverName) {
          hasSelf = true;
          break;
        }
        // Check mutual: does receiver give back to giver?
        if (mapping[receiverName] === giverName) {
          hasMutual = true;
          break;
        }
      }

      if (!hasSelf && !hasMutual) {
        valid = true;
        break;
      }
    }

    if (!valid) {
      return null;
    }

    // Return mapping array
    return givers.map((giver) => {
      const receiverIndex = receivers.findIndex(r => r.name === giver.name);
      // Wait, receivers array aligns with givers indices where receivers[i] is received by givers[i]?
      // Let's map properly: givers[i] gives to receivers[i]
    });
  };

  // Helper function returning structured pairs { giver: name, receiver: name }
  const computePairings = (participantsList) => {
    const names = participantsList.map(p => p.name);
    let attempts = 0;

    while (attempts < 2000) {
      attempts++;
      // Shuffle a copy of names for receivers
      let receivers = [...names];
      for (let i = receivers.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [receivers[i], receivers[j]] = [receivers[j], receivers[i]];
      }

      let valid = true;
      let map = {};
      for (let i = 0; i < names.length; i++) {
        map[names[i]] = receivers[i];
      }

      for (let i = 0; i < names.length; i++) {
        const giver = names[i];
        const receiver = map[giver];

        // Rule 1: No self-gifting
        if (giver === receiver) {
          valid = false;
          break;
        }
        // Rule 2: No mutual gifting (A -> B and B -> A)
        if (map[receiver] === giver) {
          valid = false;
          break;
        }
      }

      if (valid) {
        return names.map((name, idx) => ({
          name: name,
          recipient_name: receivers[idx]
        }));
      }
    }
    return null;
  };

  // --- STEP 1: CREATE DRAW ONLY ("Comença") ---
  const handleCreateDraw = async (e) => {
    e?.preventDefault();
    const cleanSlug = drawSlugInput.trim().toLowerCase().replace(/\s+/g, '-');
    if (!cleanSlug) {
      setDrawError('El slug del sorteig no pot estar buit.');
      return;
    }

    setDrawError('');
    setIsSaving(true);

    const emergencyToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    
    const newDrawRecord = {
      slug: cleanSlug,
      admin_pin: adminPinInput.trim() || '1234',
      emergency_token: emergencyToken,
      budget: budget || '20€',
      event_date: eventDate || ''
    };

    try {
      // 1. Insert row into 'draws' table first
      const { data: insertedDraw, error: drawErr } = await supabase
        .from('draws')
        .insert(newDrawRecord)
        .select()
        .single();

      if (drawErr) throw drawErr;

      setDrawData(insertedDraw);
      window.history.pushState({}, '', `?draw=${cleanSlug}`);
      setAdminTab('setup');
    } catch (err) {
      console.error(err);
      setDrawError("Error creant el sorteig a Supabase. Comprova que el slug no estigui duplicat.");
    } finally {
      setIsSaving(false);
    }
  };

  // --- PARTICIPANT SETUP HANDLERS (Before draw is generated) ---
  const handleAddParticipantSetup = (e) => {
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

  const handleAddBulkSetup = () => {
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

  const handleRemoveParticipantSetup = (index) => {
    setSetupParticipants(setupParticipants.filter((_, i) => i !== index));
  };

  const handleRegeneratePinSetup = (index) => {
    const updated = [...setupParticipants];
    updated[index].pin = Math.floor(1000 + Math.random() * 9000).toString();
    setSetupParticipants(updated);
  };

  // --- STEP 2: GENERATE DRAW ASSIGNMENTS ("Generar Sorteig") ---
  const handleGenerateDrawAssignments = async () => {
    if (setupParticipants.length < 3) {
      setDrawError('Es necessiten almenys 3 participants per fer el sorteig!');
      return;
    }
    if (!drawData) return;

    setDrawError('');
    setIsSaving(true);

    const pairs = computePairings(setupParticipants);
    if (!pairs) {
      setDrawError('No sota cap combinació s’ha pogut evitar el regal mutu amb aquest nombre de participants. Prova d’afegir-ne un de nou!');
      setIsSaving(false);
      return;
    }

    try {
      // Map back pins to generated pairings
      const participantRows = pairs.map((pair) => {
        const originalObj = setupParticipants.find(p => p.name === pair.name);
        return {
          draw_slug: drawData.slug,
          name: pair.name,
          pin: originalObj.pin,
          recipient_name: pair.recipient_name
        };
      });

      const { data: insertedParts, error: partErr } = await supabase
        .from('participants')
        .insert(participantRows)
        .select();

      if (partErr) throw partErr;

      setDbParticipants(insertedParts || []);
      setAdminTab('results');
    } catch (err) {
      console.error(err);
      setDrawError('Error guardant els participants a Supabase.');
    } finally {
      setIsSaving(false);
    }
  };

  // --- UPDATE DRAW SETTINGS ---
  const handleUpdateDrawSettings = async (e) => {
    e?.preventDefault();
    if (!drawData) return;
    setIsSaving(true);
    setDrawError('');

    try {
      const updatedFields = {
        admin_pin: adminPinInput.trim() || '1234',
        budget: budget || '',
        event_date: eventDate || ''
      };

      const { data, error } = await supabase
        .from('draws')
        .update(updatedFields)
        .eq('slug', drawData.slug)
        .select()
        .single();

      if (error) throw error;
      setDrawData(data);
      alert("Canvis guardats correctament!");
    } catch (err) {
      console.error(err);
      setDrawError("Error en actualitzar la configuració.");
    } finally {
      setIsSaving(false);
    }
  };

  // --- RE-RUN DRAW WITH EXISTING PARTICIPANTS ---
  const handleReRunDraw = async () => {
    if (dbParticipants.length < 3) {
      setDrawError('Es necessiten almenys 3 participants.');
      return;
    }
    if (!confirm("Vols tornar a sortejar les assignacions evitant regals mutus?")) return;

    setIsSaving(true);
    const pairs = computePairings(dbParticipants);
    if (!pairs) {
      setDrawError('No s’ha pogut generar un sorteig vàlid sense regals mutus. Torna-ho a provar.');
      setIsSaving(false);
      return;
    }

    try {
      for (let i = 0; i < pairs.length; i++) {
        const participantObj = dbParticipants.find(p => p.name === pairs[i].name);
        if (participantObj) {
          await supabase
            .from('participants')
            .update({ recipient_name: pairs[i].recipient_name })
            .eq('id', participantObj.id);
        }
      }

      const { data: refreshedParts } = await supabase
        .from('participants')
        .select('*')
        .eq('draw_slug', drawData.slug);

      if (refreshedParts) setDbParticipants(refreshedParts);
      setIsSaving(false);
      alert("Sorteig actualitzat amb noves assignacions sense regals mutus!");
    } catch (err) {
      console.error(err);
      setDrawError("Error en actualitzar les assignacions.");
      setIsSaving(false);
    }
  };

  // --- ADD / DELETE PARTICIPANT FROM ACTIVE DRAW ---
  const [newActiveName, setNewActiveName] = useState('');
  const handleAddParticipantActive = async (e) => {
    e?.preventDefault();
    const trimmed = newActiveName.trim();
    if (!trimmed || !drawData) return;

    if (dbParticipants.some(p => p.name.toLowerCase() === trimmed.toLowerCase())) {
      setDrawError(`El participant "${trimmed}" ja existeix.`);
      return;
    }

    const pin = Math.floor(1000 + Math.random() * 9000).toString();
    try {
      const { data, error } = await supabase
        .from('participants')
        .insert({
          draw_slug: drawData.slug,
          name: trimmed,
          pin: pin,
          recipient_name: 'Pendent de re-sorteig'
        })
        .select()
        .single();

      if (error) throw error;
      setDbParticipants([...dbParticipants, data]);
      setNewActiveName('');
      setDrawError('');
    } catch (err) {
      console.error(err);
      setDrawError("Error afegint participant.");
    }
  };

  const handleDeleteParticipantActive = async (participantId) => {
    if (!confirm("Vols eliminar aquest participant? Es recomana tornar a fer el sorteig després.")) return;
    try {
      const { error } = await supabase
        .from('participants')
        .delete()
        .eq('id', participantId);

      if (error) throw error;
      setDbParticipants(dbParticipants.filter(p => p.id !== participantId));
    } catch (err) {
      console.error(err);
      setDrawError("Error eliminant participant.");
    }
  };

  // --- URL HELPERS ---
  const getMasterUrl = () => drawData?.slug ? `${window.location.origin}${window.location.pathname}?draw=${drawData.slug}` : '';
  const getEmergencyUrl = () => drawData?.slug && drawData?.emergency_token 
    ? `${window.location.origin}${window.location.pathname}?draw=${drawData.slug}&admin=${drawData.emergency_token}` 
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
      setLoginError("Selecciona o carrega un sorteig vàlid.");
      return;
    }

    if (input === drawData.admin_pin) {
      setMode('admin_panel');
      setAdminTab(dbParticipants.length > 0 ? 'results' : 'setup');
      setLoginInput('');
      return;
    }

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

  const handleStartNewDrawWizard = () => {
    window.history.pushState({}, '', window.location.pathname);
    setDrawData(null);
    setDbParticipants([]);
    setSetupParticipants([]);
    setDrawSlugInput('familia-2026');
    setAdminPinInput('1234');
    setBudget('30€');
    setEventDate('');
    setMode('admin_panel');
    setAdminTab('setup');
  };

  // --- WISHLIST HANDLERS ---
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
      <div className="min-h-screen bg-[#071B14] text-[#5BC58A] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="text-xs text-[#B6BDAF]">Carregant dades del sorteig...</span>
      </div>
    );
  }

  // =========================================================================
  // 1. LOGIN SCREEN
  // =========================================================================
  if (mode === 'login') {
    return (
      <div className="min-h-screen bg-[#071B14] text-[#F8F3E7] font-sans flex flex-col justify-between p-4">
        <header className="max-w-md mx-auto w-full pt-8 text-center">
          <div className="inline-flex items-center justify-center p-3 bg-[#123D29] border border-[#4BAE72]/40 rounded-2xl mb-3 shadow-lg text-[#5BC58A]">
            <Gift className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-extrabold text-[#FFF9EC] tracking-tight">Amic Invisible Secret</h1>
          <p className="text-xs text-[#B6BDAF] mt-1">
            {drawData ? `Sorteig actiu: "${drawData.slug}"` : 'Accés amb codi PIN'}
          </p>
        </header>

        <main className="max-w-md mx-auto w-full px-2 space-y-4">
          <div className="bg-[#102B20] border border-[#294A38] rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
            {!drawData ? (
              <div className="text-center space-y-4 py-4">
                <div className="w-12 h-12 bg-amber-500/10 text-[#E9BD65] border border-[#D6AA52]/40 rounded-2xl flex items-center justify-center mx-auto">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <h2 className="text-lg font-bold text-[#FFF9EC]">Cap sorteig seleccionat</h2>
                <p className="text-xs text-[#B6BDAF] leading-relaxed">
                  Assegura't d'utilitzar l'enllaç correcte proporcionat per l'organitzador (amb <code>?draw=slug-del-sorteig</code>) o crea un nou sorteig:
                </p>
                <button
                  onClick={handleStartNewDrawWizard}
                  className="w-full py-3 bg-[#167344] hover:bg-[#218C55] text-[#FFF9EC] font-semibold rounded-xl text-xs transition flex items-center justify-center gap-2"
                >
                  <PlusCircle className="w-4 h-4" /> Crear un nou Sorteig
                </button>
              </div>
            ) : (
              <form onSubmit={handleLoginSubmit} className="space-y-5 text-center">
                <div>
                  <h2 className="text-lg font-bold text-[#FFF9EC]">Identificació</h2>
                  <p className="text-xs text-[#B6BDAF] mt-1">
                    Introdueix el teu <span className="text-[#E9BD65] font-semibold">PIN de 4 dígits</span>:
                  </p>
                </div>

                <input
                  type="password"
                  maxLength={10}
                  autoFocus
                  placeholder="••••"
                  value={loginInput}
                  onChange={(e) => setLoginInput(e.target.value)}
                  className="w-full max-w-[200px] mx-auto text-center text-3xl tracking-[0.4em] font-mono bg-[#071B14] border-2 border-[#365A45] rounded-2xl py-3 text-[#E9BD65] placeholder-slate-700 focus:outline-none focus:border-emerald-500 transition block"
                />

                {loginError && (
                  <p className="text-xs text-[#E87575] font-medium bg-[#521E25]/60 border border-[#C95757]/40 p-2.5 rounded-xl">
                    {loginError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={!loginInput.trim()}
                  className="w-full py-3.5 bg-gradient-to-r from-[#167344] to-[#8F2635] hover:from-[#218C55] hover:to-[#AC3544] disabled:opacity-40 text-[#FFF9EC] font-bold rounded-xl shadow-lg transition text-sm flex items-center justify-center gap-2"
                >
                  <Unlock className="w-4 h-4" /> Entrar
                </button>

                {drawData.budget && (
                  <div className="pt-3 border-t border-[#294A38] text-xs text-[#B6BDAF] flex justify-center gap-4">
                    <span>Presupost: <strong className="text-[#E9BD65]">{drawData.budget}</strong></span>
                    {drawData.event_date && <span>Data: <strong className="text-[#5BC58A]">{drawData.event_date}</strong></span>}
                  </div>
                )}
              </form>
            )}
          </div>

          <div className="text-center pt-2">
            <button
              onClick={handleStartNewDrawWizard}
              className="text-xs text-[#B6BDAF] hover:text-[#5BC58A] transition inline-flex items-center gap-1.5"
            >
              <PlusCircle className="w-3.5 h-3.5" /> Vols organitzar un altre sorteig diferent?
            </button>
          </div>
        </main>

        <footer className="max-w-md mx-auto w-full text-center text-[11px] text-[#718475] pb-4">
          🎄 creat amb amor per l'Alvit 🎄
        </footer>
      </div>
    );
  }

  // =========================================================================
  // 2. PARTICIPANT VIEW
  // =========================================================================
  if (mode === 'participant_view' && currentGiver) {
    return (
      <div className="min-h-screen bg-[#071B14] text-[#F8F3E7] font-sans pb-16">
        <header className="border-b border-[#294A38] bg-[#102B20]/80 backdrop-blur sticky top-0 z-50">
          <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="bg-gradient-to-tr from-[#167344] to-[#8F2635] p-2 rounded-xl text-[#FFF9EC]">
                <Gift className="w-5 h-5" />
              </div>
              <span className="font-bold text-lg text-[#D7F2DE]">Amic Invisible ({drawData?.slug})</span>
            </div>
            <button
              onClick={handleLogout}
              className="text-xs bg-[#1B3B2D] hover:bg-[#28513D] text-[#D6D0BF] px-3 py-1.5 rounded-lg border border-[#365A45] flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5 text-[#E87575]" />
              <span>Tancar Sessió</span>
            </button>
          </div>
        </header>

        <main className="max-w-xl mx-auto px-4 pt-8 space-y-6">
          <div className="bg-[#102B20] border border-[#294A38] px-4 py-3 rounded-2xl text-xs text-[#D6D0BF]">
            Participant connectat: <strong className="text-[#5BC58A]">{currentGiver.name}</strong>
          </div>

          <div className="bg-[#102B20]/90 border border-[#294A38] rounded-3xl p-6 sm:p-8 shadow-xl text-center space-y-6">
            <div className="inline-flex items-center space-x-2 bg-[#123D29] border border-[#4BAE72]/40 text-[#83D9A5] text-xs font-semibold px-3 py-1 rounded-full">
              <Sparkles className="w-3.5 h-3.5 text-[#E9BD65]" />
              <span>Assignació Privada (Sense regals mutus)</span>
            </div>

            <h1 className="text-2xl font-extrabold text-[#FFF9EC]">
              Hola, <span className="text-[#5BC58A]">{currentGiver.name}</span>! 🎁
            </h1>

            <div className="my-4">
              {!isRevealed ? (
                <button
                  onClick={() => setIsRevealed(true)}
                  className="w-full py-8 px-4 bg-gradient-to-br from-[#167344] to-[#104D32] hover:from-[#218C55] hover:to-[#17643F] text-[#FFF9EC] font-bold rounded-2xl shadow-xl border border-[#70C98B]/40 flex flex-col items-center justify-center space-y-2"
                >
                  <Eye className="w-8 h-8 text-emerald-200" />
                  <span className="text-base sm:text-lg">Prem per descobrir a qui has de regalar</span>
                </button>
              ) : (
                <div className="p-6 bg-[#071B14] border-2 border-[#4BAE72]/60 rounded-2xl space-y-4 text-left">
                  <div className="text-center">
                    <div className="text-xs text-[#B6BDAF] uppercase tracking-wider mb-1">El teu amic invisible és:</div>
                    <div className="text-3xl sm:text-4xl font-black text-[#E9BD65] my-2">
                      🎁 {currentGiver.recipient_name} 🎁
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-[#294A38] space-y-2">
                    <h3 className="text-xs font-bold text-[#83D9A5] uppercase tracking-wide flex items-center gap-1.5">
                      <Heart className="w-3.5 h-3.5 text-[#E87575]" />
                      Suggeriments de regal de {currentGiver.recipient_name}:
                    </h3>
                    {recipientWishlist.length > 0 ? (
                      <ul className="space-y-1.5 bg-[#102B20] border border-[#294A38] p-3 rounded-xl">
                        {recipientWishlist.map((item) => (
                          <li key={item.id} className="text-xs text-[#E9E4D5] flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                            {item.item_text}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-[#87988A] italic bg-[#102B20]/50 p-3 rounded-xl text-center">
                        Encara no ha afegit cap suggeriment de regal.
                      </p>
                    )}
                  </div>

                  <div className="text-center pt-2">
                    <button
                      onClick={() => setIsRevealed(false)}
                      className="text-xs text-[#B6BDAF] hover:text-[#E9E4D5] inline-flex items-center gap-1 underline"
                    >
                      <EyeOff className="w-3.5 h-3.5" /> Amagar per seguretat
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-[#102B20]/90 border border-[#294A38] rounded-3xl p-6 shadow-xl space-y-4">
            <div>
              <h2 className="text-base font-bold text-[#FFF9EC] flex items-center gap-2">
                <Heart className="w-5 h-5 text-[#E87575]" />
                <span>La meva llista de suggeriments</span>
              </h2>
              <p className="text-xs text-[#B6BDAF] mt-1">
                Es guarda al núvol instantàniament!
              </p>
            </div>

            <form onSubmit={handleAddWishItem} className="flex gap-2">
              <input
                type="text"
                placeholder="Ex: Llibre, mitjons calents..."
                value={newWishItem}
                onChange={(e) => setNewWishItem(e.target.value)}
                className="flex-1 bg-[#071B14] border border-[#365A45] rounded-xl px-3.5 py-2 text-xs text-[#FFF9EC] focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <button
                type="submit"
                disabled={!newWishItem.trim()}
                className="bg-[#167344] hover:bg-[#218C55] disabled:opacity-50 text-[#FFF9EC] font-medium px-4 py-2 rounded-xl text-xs flex items-center gap-1"
              >
                <Plus className="w-4 h-4" /> Afegeix
              </button>
            </form>

            {myWishlist.length > 0 ? (
              <div className="space-y-2 pt-1">
                {myWishlist.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between bg-[#071B14] border border-[#294A38] px-3.5 py-2.5 rounded-xl text-xs text-[#E9E4D5]"
                  >
                    <span>{item.item_text}</span>
                    <button
                      onClick={() => handleRemoveWishItem(item.id)}
                      className="text-[#718475] hover:text-[#E87575]"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center py-4 text-[#87988A] text-xs border border-dashed border-[#294A38] rounded-xl">
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
    <div className="min-h-screen bg-[#071B14] text-[#F8F3E7] font-sans pb-16">
      <header className="border-b border-[#294A38] bg-[#102B20]/90 backdrop-blur sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-tr from-[#E9BD65] to-[#B88935] p-2.5 rounded-2xl text-slate-950 font-bold">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-[#FFF9EC]">Panell d'Organitzador</h1>
              <p className="text-xs text-[#B6BDAF]">Àrea restringida</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleStartNewDrawWizard}
              className="text-xs bg-[#167344] hover:bg-[#218C55] text-[#FFF9EC] px-3 py-2 rounded-xl flex items-center gap-1 font-semibold"
            >
              <PlusCircle className="w-3.5 h-3.5" /> Nou Sorteig
            </button>
            <button
              onClick={() => setMode('login')}
              className="text-xs bg-[#1B3B2D] hover:bg-[#28513D] text-[#D6D0BF] px-3 py-2 rounded-xl flex items-center gap-1.5 border border-[#365A45]"
            >
              <KeyRound className="w-4 h-4 text-[#E9BD65]" /> Login
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 pt-8 space-y-6">
        {drawError && (
          <div className="bg-[#521E25]/80 border border-[#C95757]/60 text-[#FFD0CC] p-4 rounded-2xl text-xs flex items-center justify-between">
            <span>{drawError}</span>
            <button onClick={() => setDrawError('')}>✕</button>
          </div>
        )}

        <div className="flex border-b border-[#294A38] gap-4">
          {!drawData ? (
            <button className="pb-3 text-sm font-semibold border-b-2 border-emerald-500 text-[#5BC58A]">
              Pas 1: Crear Sorteig
            </button>
          ) : dbParticipants.length === 0 ? (
            <button className="pb-3 text-sm font-semibold border-b-2 border-emerald-500 text-[#5BC58A]">
              Pas 2: Afegir Participants i Generar Sorteig ({setupParticipants.length})
            </button>
          ) : (
            <>
              <button
                onClick={() => setAdminTab('results')}
                className={`pb-3 text-sm font-semibold border-b-2 ${
                  adminTab === 'results' ? 'border-emerald-500 text-[#5BC58A]' : 'border-transparent text-[#B6BDAF]'
                }`}
              >
                Resultats i Participants ({dbParticipants.length})
              </button>
              <button
                onClick={() => setAdminTab('settings')}
                className={`pb-3 text-sm font-semibold border-b-2 ${
                  adminTab === 'settings' ? 'border-emerald-500 text-[#5BC58A]' : 'border-transparent text-[#B6BDAF]'
                }`}
              >
                Modificar Sorteig
              </button>
            </>
          )}
        </div>

        {/* --- STEP 1: CREATE DRAW ONLY ("Comença") --- */}
        {!drawData && (
          <div className="max-w-xl mx-auto bg-[#102B20] border border-[#294A38] rounded-3xl p-6 sm:p-8 space-y-6">
            <div className="text-center space-y-2">
              <div className="inline-flex items-center justify-center p-3 bg-[#123D29] border border-[#4BAE72]/40 rounded-2xl text-[#5BC58A] mb-1">
                <Settings className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-[#FFF9EC]">Configura el teu Sorteig</h2>
              <p className="text-xs text-[#B6BDAF]">
                Primer defineix els detalls bàsics. Això registrarà el sorteig a Supabase i generarà el teu PIN d'organitzador (<code>1234</code> per defecte) i el testimoni d'emergència.
              </p>
            </div>

            <form onSubmit={handleCreateDraw} className="space-y-4">
              <div>
                <label className="block text-xs text-[#B6BDAF] mb-1">Slug (Identificador URL únic)</label>
                <input
                  type="text"
                  value={drawSlugInput}
                  onChange={(e) => setDrawSlugInput(e.target.value)}
                  className="w-full bg-[#071B14] border border-[#365A45] rounded-xl px-3.5 py-2.5 text-xs text-[#5BC58A] font-mono"
                  placeholder="familia-2026"
                />
                <p className="text-[10px] text-[#87988A] mt-1">Aquest serà l'ID immutable a l'enllaç web.</p>
              </div>
              <div>
                <label className="block text-xs text-[#B6BDAF] mb-1">Data de l'Esdeveniment</label>
                <input
                  type="text"
                  placeholder="24 de Desembre"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="w-full bg-[#071B14] border border-[#365A45] rounded-xl px-3.5 py-2.5 text-xs text-[#FFF9EC]"
                />
              </div>
              <div>
                <label className="block text-xs text-[#B6BDAF] mb-1">Presupost</label>
                <input
                  type="text"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  className="w-full bg-[#071B14] border border-[#365A45] rounded-xl px-3.5 py-2.5 text-xs text-[#FFF9EC]"
                />
              </div>
              <div>
                <label className="block text-xs text-[#B6BDAF] mb-1">PIN d'Organitzador</label>
                <input
                  type="text"
                  value={adminPinInput}
                  onChange={(e) => setAdminPinInput(e.target.value)}
                  className="w-full bg-[#071B14] border border-[#365A45] rounded-xl px-3.5 py-2.5 text-xs text-[#E9BD65] font-mono font-bold"
                />
              </div>

              <button
                type="submit"
                disabled={isSaving}
                className="w-full py-3.5 bg-gradient-to-r from-[#167344] to-[#8F2635] hover:from-[#218C55] hover:to-[#AC3544] disabled:opacity-40 text-[#FFF9EC] font-bold rounded-2xl text-sm flex items-center justify-center gap-2 mt-2 shadow-lg transition"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-[#F2D48B]" />}
                <span>{isSaving ? 'Creant Sorteig...' : 'Comença'}</span>
              </button>
            </form>
          </div>
        )}

        {/* --- STEP 2: ADD PARTICIPANTS & "Generar Sorteig" --- */}
        {drawData && dbParticipants.length === 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-1 space-y-6">
              <div className="bg-[#102B20] border border-[#294A38] rounded-3xl p-5 space-y-4">
                <h3 className="font-bold text-[#FFF9EC] text-sm flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-[#5BC58A]" />
                  <span>Afegir Participant</span>
                </h3>

                {!showBulkInput ? (
                  <form onSubmit={handleAddParticipantSetup} className="space-y-3">
                    <input
                      type="text"
                      placeholder="Nom del participant..."
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      className="w-full bg-[#071B14] border border-[#365A45] rounded-xl px-3.5 py-2 text-xs text-[#FFF9EC]"
                    />
                    <button
                      type="submit"
                      disabled={!nameInput.trim()}
                      className="w-full bg-[#167344] hover:bg-[#218C55] disabled:opacity-50 text-[#FFF9EC] font-medium py-2 rounded-xl text-xs"
                    >
                      Afegir participant
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowBulkInput(true)}
                      className="w-full text-xs text-[#B6BDAF] hover:text-[#E9E4D5] py-1"
                    >
                      O enganxar llista de cop...
                    </button>
                  </form>
                ) : (
                  <div className="space-y-3">
                    <textarea
                      rows={4}
                      placeholder={"Laura\nMarc\nClara"}
                      value={bulkInput}
                      onChange={(e) => setBulkInput(e.target.value)}
                      className="w-full bg-[#071B14] border border-[#365A45] rounded-xl p-3 text-xs text-[#FFF9EC]"
                    />
                    <div className="flex gap-2">
                      <button onClick={handleAddBulkSetup} className="flex-1 bg-[#167344] text-[#FFF9EC] py-2 rounded-xl text-xs font-semibold">
                        Afegir tots
                      </button>
                      <button onClick={() => setShowBulkInput(false)} className="bg-[#1B3B2D] text-[#D6D0BF] px-3 py-2 rounded-xl text-xs">
                        Cancel·lar
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-[#102B20] border border-[#294A38] rounded-3xl p-5 space-y-2 text-xs text-[#B6BDAF]">
                <span className="font-bold text-[#FFF9EC] block mb-1">Sorteig Creat:</span>
                <p>Slug: <strong className="text-[#5BC58A]">{drawData.slug}</strong></p>
                <p>Pressupost: <strong className="text-[#E9BD65]">{drawData.budget}</strong></p>
                {drawData.event_date && <p>Data: <strong className="text-[#FFF9EC]">{drawData.event_date}</strong></p>}
              </div>
            </div>

            <div className="md:col-span-2 bg-[#102B20] border border-[#294A38] rounded-3xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-[#294A38] pb-3">
                <h3 className="font-bold text-[#FFF9EC] text-base">Participants Afegits</h3>
                <span className="text-xs text-[#5BC58A]">{setupParticipants.length} persones</span>
              </div>

              {setupParticipants.length === 0 ? (
                <div className="py-10 text-center text-[#87988A] text-xs border border-dashed border-[#294A38] rounded-2xl">
                  Afegeix almenys 3 participants per poder fer el sorteig.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {setupParticipants.map((person, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-[#071B14] border border-[#294A38] px-3.5 py-2.5 rounded-2xl text-xs">
                      <div>
                        <span className="font-bold text-[#FFF9EC] block">{person.name}</span>
                        <span className="font-mono text-[#E9BD65] text-[11px]">PIN: <strong>{person.pin}</strong></span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleRegeneratePinSetup(idx)} className="text-[#87988A] hover:text-[#E9BD65] p-1">
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleRemoveParticipantSetup(idx)} className="text-[#87988A] hover:text-[#E87575] p-1">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={handleGenerateDrawAssignments}
                disabled={setupParticipants.length < 3 || isSaving}
                className="w-full py-3.5 bg-gradient-to-r from-[#167344] to-[#8F2635] disabled:opacity-40 text-[#FFF9EC] font-bold rounded-2xl text-sm flex items-center justify-center gap-2 mt-4"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-[#F2D48B]" />}
                <span>{isSaving ? 'Guardant Participants...' : 'Generar Sorteig (Sense regals mutus)'}</span>
              </button>
            </div>
          </div>
        )}

        {/* --- ORGANIZER MENU: RESULTS & ASSIGNMENTS --- */}
        {drawData && dbParticipants.length > 0 && adminTab === 'results' && (
          <div className="space-y-6">
            <div className="bg-[#102B20] border border-[#294A38] rounded-3xl p-6 space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#294A38] pb-4">
                <div>
                  <h3 className="text-lg font-bold text-[#FFF9EC] flex items-center gap-2">
                    <Check className="w-5 h-5 text-[#5BC58A]" />
                    <span>Sorteig "{drawData.slug}" Actiu!</span>
                  </h3>
                  <p className="text-xs text-[#B6BDAF] mt-1">Comparteix aquest enllaç web amb els participants:</p>
                </div>
                <button
                  onClick={copyMasterLink}
                  className="bg-[#167344] hover:bg-[#218C55] text-[#FFF9EC] text-xs font-semibold px-4 py-2.5 rounded-xl flex items-center gap-2"
                >
                  {copiedMasterLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedMasterLink ? 'Copiat!' : 'Copiar Enllaç del Sorteig'}</span>
                </button>
              </div>

              <div className="bg-[#4A3519]/40 border border-[#D6AA52]/40 p-4 rounded-2xl space-y-2">
                <div className="flex items-center gap-2 text-[#E9BD65] text-xs font-bold">
                  <ShieldAlert className="w-4 h-4" />
                  <span>Enllaç d'Emergència de l'Organitzador</span>
                </div>
                <div className="flex gap-2 pt-1">
                  <input
                    type="text"
                    readOnly
                    value={getEmergencyUrl()}
                    className="w-full bg-[#071B14] border border-[#D6AA52]/40 rounded-xl px-3 py-2 text-[11px] text-[#F2D48B] font-mono"
                  />
                  <button
                    onClick={copyEmergencyLink}
                    className="bg-[#B88935] text-slate-950 font-bold px-3 py-2 rounded-xl text-xs whitespace-nowrap"
                  >
                    {copiedEmergencyLink ? 'Desat!' : 'Copiar'}
                  </button>
                </div>
              </div>

              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm text-[#FFF9EC]">Gestionar Participants</h4>
                  <button
                    onClick={handleReRunDraw}
                    disabled={isSaving}
                    className="bg-[#1B3B2D] hover:bg-[#28513D] border border-[#365A45] text-[#E9BD65] px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Re-fer Sorteig
                  </button>
                </div>

                <form onSubmit={handleAddParticipantActive} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Afegir nou participant..."
                    value={newActiveName}
                    onChange={(e) => setNewActiveName(e.target.value)}
                    className="flex-1 bg-[#071B14] border border-[#365A45] rounded-xl px-3.5 py-2 text-xs text-[#FFF9EC]"
                  />
                  <button
                    type="submit"
                    disabled={!newActiveName.trim()}
                    className="bg-[#167344] hover:bg-[#218C55] text-[#FFF9EC] px-4 py-2 rounded-xl text-xs font-semibold"
                  >
                    Afegir
                  </button>
                </form>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-[#294A38] text-[#B6BDAF] uppercase">
                        <th className="py-3 px-4">Participant</th>
                        <th className="py-3 px-4">Codi PIN</th>
                        <th className="py-3 px-4">Regala a:</th>
                        <th className="py-3 px-4 text-right">Accions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {dbParticipants.map((item) => (
                        <tr key={item.id}>
                          <td className="py-3 px-4 font-bold text-[#FFF9EC]">{item.name}</td>
                          <td className="py-3 px-4">
                            <span className="font-mono text-[#E9BD65] bg-[#4A3519]/50 border border-[#D6AA52]/40 px-2.5 py-1 rounded-lg font-bold">
                              {item.pin}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-[#5BC58A] font-semibold">🎁 {item.recipient_name}</td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => handleDeleteParticipantActive(item.id)}
                              className="text-[#718475] hover:text-[#E87575] p-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- ORGANIZER MENU: MODIFY DRAW SETTINGS (Except Slug) --- */}
        {drawData && dbParticipants.length > 0 && adminTab === 'settings' && (
          <div className="bg-[#102B20] border border-[#294A38] rounded-3xl p-6 space-y-6">
            <div>
              <h3 className="text-lg font-bold text-[#FFF9EC]">Modificar Configuració del Sorteig</h3>
              <p className="text-xs text-[#B6BDAF] mt-1">Pots editar el pressupost, la data i el PIN d'organitzador (el slug no es pot modificar).</p>
            </div>

            <form onSubmit={handleUpdateDrawSettings} className="space-y-4 max-w-lg">
              <div>
                <label className="block text-[11px] text-[#B6BDAF] mb-1">Slug (Identificador únic - No modificable)</label>
                <input
                  type="text"
                  disabled
                  value={drawData.slug}
                  className="w-full bg-[#071B14]/60 border border-[#294A38] rounded-xl px-3.5 py-2 text-xs text-[#87988A] font-mono cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-[11px] text-[#B6BDAF] mb-1">PIN d'Organitzador</label>
                <input
                  type="text"
                  value={adminPinInput}
                  onChange={(e) => setAdminPinInput(e.target.value)}
                  className="w-full bg-[#071B14] border border-[#365A45] rounded-xl px-3.5 py-2 text-xs text-[#E9BD65] font-mono font-bold"
                />
              </div>
              <div>
                <label className="block text-[11px] text-[#B6BDAF] mb-1">Pressupost</label>
                <input
                  type="text"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  className="w-full bg-[#071B14] border border-[#365A45] rounded-xl px-3.5 py-2 text-xs text-[#FFF9EC]"
                />
              </div>
              <div>
                <label className="block text-[11px] text-[#B6BDAF] mb-1">Data de l'Esdeveniment</label>
                <input
                  type="text"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="w-full bg-[#071B14] border border-[#365A45] rounded-xl px-3.5 py-2 text-xs text-[#FFF9EC]"
                />
              </div>

              <button
                type="submit"
                disabled={isSaving}
                className="py-3 px-6 bg-[#167344] hover:bg-[#218C55] text-[#FFF9EC] font-bold rounded-xl text-xs flex items-center gap-2"
              >
                {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>Guardar Canvis</span>
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
