import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const translations = {
  ca: {
    appTitle: 'Amic Invisible',
    langToggle: 'EN',
    langToggleLabel: 'Switch to English',
    loading: 'Carregant...',
    footer: "Creat amb amor per l'Alvit. Bon Nadal 🎄",
    logout: 'Tancar sessió',
    cancel: 'Cancel·lar',
    confirm: 'Confirmar',
    close: 'Tancar',
    copy: 'Copiar',
    copied: 'Copiat!',
    save: 'Guardar',
    add: 'Afegir',
    remove: 'Eliminar',
    show: 'Mostrar',
    hide: 'Amagar',
    budget: 'Pressupost',
    date: 'Data',

    // Draw not found / landing
    noDrawTitle: 'Cap sorteig seleccionat',
    noDrawDesc: "Fes servir l'enllaç que t'ha enviat l'organitzador, o crea un sorteig nou.",
    drawNotFoundTitle: 'Sorteig no trobat',
    drawNotFoundDesc: "No existeix cap sorteig amb aquest enllaç. Revisa'l amb l'organitzador.",
    createNewDraw: 'Crear un sorteig nou',
    organizeAnother: 'Vols organitzar un altre sorteig?',

    // Login
    activeDraw: 'Sorteig: {slug}',
    loginTitle: 'Identificació',
    loginDesc: 'Introdueix el teu PIN',
    pinPlaceholder: 'PIN',
    pinLabel: 'Codi PIN',
    enter: 'Entrar',

    // Participant
    connectedAs: 'Connectat com a {name}',
    privateAssignment: 'Assignació privada',
    hello: 'Hola, {name}! 🎁',
    revealBtn: 'Prem per descobrir a qui has de regalar',
    yourRecipient: 'El teu amic invisible és:',
    hideForSafety: 'Amagar per seguretat',
    notDrawnYet: "L'organitzador encara no ha fet el sorteig. Torna-ho a mirar més tard!",
    recipientWishes: 'Suggeriments de {name}',
    noRecipientWishes: 'Encara no ha afegit cap suggeriment.',
    myWishlist: 'La meva llista de desitjos',
    myWishlistDesc: 'La veurà només qui et faci el regal.',
    wishPlaceholder: 'Ex: un llibre, mitjons calents...',
    noMyWishes: 'Encara no has afegit cap suggeriment.',
    wishAdded: 'Suggeriment afegit',
    wishRemoved: 'Suggeriment eliminat',
    charsLeft: '{n} caràcters restants',

    // Create draw
    createTitle: 'Crea el teu sorteig',
    createDesc: "Dona-li un nom i tria el teu PIN d'organitzador. L'enllaç tindrà un sufix aleatori.",
    drawName: 'Nom del sorteig',
    drawNamePlaceholder: 'Família 2026',
    adminPin: "PIN d'organitzador",
    adminPinHint: '4 a 8 dígits. Diferent dels PINs dels participants.',
    eventDate: "Data de l'esdeveniment",
    budgetEur: 'Pressupost (€)',
    createBtn: 'Crear sorteig',
    creating: 'Creant...',
    drawCreated: 'Sorteig creat!',

    // Admin
    organizerPanel: "Panell d'organitzador",
    tabParticipants: 'Participants',
    tabSettings: 'Configuració',
    participantLink: 'Enllaç per als participants',
    participantLinkDesc: 'Comparteix aquest enllaç. Cada persona entra amb el seu PIN.',
    adminLink: "Enllaç d'emergència de l'organitzador",
    adminLinkDesc: "Dona accés complet sense PIN. Guarda'l en un lloc segur i no el comparteixis.",
    addParticipants: 'Afegir participants',
    namePlaceholder: 'Nom del participant',
    bulkToggle: 'Enganxar una llista',
    bulkPlaceholder: 'Un nom per línia o separats per comes',
    addAll: 'Afegir tots',
    participantsAdded: '{n} participant(s) afegit(s)',
    participantsCount: '{n} participants',
    noParticipants: 'Encara no hi ha participants. Afegeix-ne almenys 3.',
    runDraw: 'Fer el sorteig',
    rerunDraw: 'Tornar a sortejar',
    min3Hint: 'Calen almenys 3 participants per fer el sorteig.',
    drawDone: 'Sorteig fet el {date}',
    drawRunToast: 'Sorteig fet!',
    rerunConfirmTitle: 'Tornar a sortejar?',
    rerunConfirmBody: 'Totes les assignacions canviaran. Qui ja hagi vist la seva haurà de tornar a mirar-la.',
    lateJoin: 'Afegir participant tard',
    lateJoinDesc: 'Entra al sorteig sense canviar les assignacions de la resta (excepte una persona).',
    lateJoinToast: '{name} afegit al sorteig',
    colName: 'Nom',
    colPin: 'PIN',
    colRecipient: 'Regala a',
    colWishes: 'Desitjos',
    colActions: 'Accions',
    sharePin: 'Compartir PIN',
    shareMessage: "Hola {name}! Ja pots veure el teu amic invisible a {url} amb el PIN {pin} 🎁",
    shareCopied: 'Missatge copiat al porta-retalls',
    resetPin: 'Nou PIN',
    resetPinConfirmTitle: 'Generar un nou PIN per a {name}?',
    resetPinConfirmBody: "L'antic PIN deixarà de funcionar.",
    resetPinToast: 'Nou PIN de {name}: {pin}',
    removeConfirmTitle: 'Eliminar {name}?',
    removeConfirmBody: 'Es perdran la seva llista de desitjos i el seu PIN.',
    removeConfirmBodyDrawn: 'Qui li regalava passarà a regalar a la persona que li tocava a {name}. Si no és possible, caldrà tornar a fer el sorteig.',
    removedToast: '{name} eliminat',
    drawResetToast: "S'ha hagut de reiniciar el sorteig. Torna'l a fer.",
    showPin: 'Mostrar PIN',
    hidePin: 'Amagar PIN',
    showRecipient: 'Mostrar destinatari',
    hideRecipient: 'Amagar destinatari',
    settingsTitle: 'Configuració del sorteig',
    settingsDesc: "L'enllaç del sorteig no es pot canviar.",
    newAdminPin: "Nou PIN d'organitzador (opcional)",
    newAdminPinHint: 'Deixa-ho buit per mantenir el PIN actual.',
    settingsSaved: 'Canvis guardats',
    adminLoggedIn: 'Benvingut, organitzador',

    // Errors
    err_unauthorized: 'Accés no autoritzat. Torna a entrar.',
    err_not_found: "No s'ha trobat.",
    err_rate_limited: 'Massa intents fallits. Espera 15 minuts i torna-ho a provar.',
    err_invalid_pin: 'PIN incorrecte.',
    err_invalid_pin_format: 'El PIN ha de tenir entre 4 i 8 dígits.',
    err_invalid_name: 'El nom ha de tenir entre 1 i 60 caràcters.',
    err_duplicate_name: 'Ja hi ha un participant que es diu "{detail}".',
    err_too_many_participants: "S'ha arribat al màxim de participants.",
    err_already_drawn: "El sorteig ja està fet. Fes servir 'Afegir participant tard'.",
    err_not_drawn: 'Encara no s\'ha fet el sorteig.',
    err_min_3: 'Calen almenys 3 participants.',
    err_invalid_text: 'El suggeriment ha de tenir entre 1 i 200 caràcters.',
    err_too_many_items: 'Has arribat al màxim de 50 suggeriments.',
    err_invalid_budget: 'Pressupost no vàlid.',
    err_pin_in_use: 'Aquest PIN ja el fa servir un participant.',
    err_generic: "Alguna cosa ha fallat. Torna-ho a provar.",
  },
  en: {
    appTitle: 'Secret Santa',
    langToggle: 'CA',
    langToggleLabel: 'Canviar a català',
    loading: 'Loading...',
    footer: 'Made with love by Alvit. Merry Christmas 🎄',
    logout: 'Log out',
    cancel: 'Cancel',
    confirm: 'Confirm',
    close: 'Close',
    copy: 'Copy',
    copied: 'Copied!',
    save: 'Save',
    add: 'Add',
    remove: 'Remove',
    show: 'Show',
    hide: 'Hide',
    budget: 'Budget',
    date: 'Date',

    noDrawTitle: 'No draw selected',
    noDrawDesc: 'Use the link the organizer sent you, or create a new draw.',
    drawNotFoundTitle: 'Draw not found',
    drawNotFoundDesc: 'There is no draw at this link. Check it with the organizer.',
    createNewDraw: 'Create a new draw',
    organizeAnother: 'Want to organize another draw?',

    activeDraw: 'Draw: {slug}',
    loginTitle: 'Sign in',
    loginDesc: 'Enter your PIN',
    pinPlaceholder: 'PIN',
    pinLabel: 'PIN code',
    enter: 'Enter',

    connectedAs: 'Signed in as {name}',
    privateAssignment: 'Private assignment',
    hello: 'Hi, {name}! 🎁',
    revealBtn: "Tap to reveal who you're gifting",
    yourRecipient: 'Your Secret Santa recipient is:',
    hideForSafety: 'Hide for privacy',
    notDrawnYet: "The organizer hasn't run the draw yet. Check back later!",
    recipientWishes: "{name}'s wishlist",
    noRecipientWishes: "They haven't added any suggestions yet.",
    myWishlist: 'My wishlist',
    myWishlistDesc: 'Only the person gifting you will see it.',
    wishPlaceholder: 'E.g. a book, warm socks...',
    noMyWishes: "You haven't added any suggestions yet.",
    wishAdded: 'Suggestion added',
    wishRemoved: 'Suggestion removed',
    charsLeft: '{n} characters left',

    createTitle: 'Create your draw',
    createDesc: 'Give it a name and choose your organizer PIN. The link gets a random suffix.',
    drawName: 'Draw name',
    drawNamePlaceholder: 'Family 2026',
    adminPin: 'Organizer PIN',
    adminPinHint: "4 to 8 digits. Must differ from participants' PINs.",
    eventDate: 'Event date',
    budgetEur: 'Budget (€)',
    createBtn: 'Create draw',
    creating: 'Creating...',
    drawCreated: 'Draw created!',

    organizerPanel: 'Organizer panel',
    tabParticipants: 'Participants',
    tabSettings: 'Settings',
    participantLink: 'Participant link',
    participantLinkDesc: 'Share this link. Everyone signs in with their own PIN.',
    adminLink: 'Organizer emergency link',
    adminLinkDesc: "Gives full access without a PIN. Keep it somewhere safe and don't share it.",
    addParticipants: 'Add participants',
    namePlaceholder: 'Participant name',
    bulkToggle: 'Paste a list',
    bulkPlaceholder: 'One name per line or comma-separated',
    addAll: 'Add all',
    participantsAdded: '{n} participant(s) added',
    participantsCount: '{n} participants',
    noParticipants: 'No participants yet. Add at least 3.',
    runDraw: 'Run the draw',
    rerunDraw: 'Re-run draw',
    min3Hint: 'You need at least 3 participants to run the draw.',
    drawDone: 'Draw run on {date}',
    drawRunToast: 'Draw done!',
    rerunConfirmTitle: 'Re-run the draw?',
    rerunConfirmBody: 'Every assignment will change. Anyone who already looked will need to check again.',
    lateJoin: 'Add a late participant',
    lateJoinDesc: "Joins the draw without changing anyone else's assignment (except one person).",
    lateJoinToast: '{name} added to the draw',
    colName: 'Name',
    colPin: 'PIN',
    colRecipient: 'Gifts to',
    colWishes: 'Wishes',
    colActions: 'Actions',
    sharePin: 'Share PIN',
    shareMessage: 'Hi {name}! You can see your Secret Santa at {url} with PIN {pin} 🎁',
    shareCopied: 'Message copied to clipboard',
    resetPin: 'New PIN',
    resetPinConfirmTitle: 'Generate a new PIN for {name}?',
    resetPinConfirmBody: 'The old PIN will stop working.',
    resetPinToast: "{name}'s new PIN: {pin}",
    removeConfirmTitle: 'Remove {name}?',
    removeConfirmBody: 'Their wishlist and PIN will be lost.',
    removeConfirmBodyDrawn: "Whoever was gifting them will gift {name}'s recipient instead. If that's not possible, you'll need to re-run the draw.",
    removedToast: '{name} removed',
    drawResetToast: 'The draw had to be reset. Please run it again.',
    showPin: 'Show PIN',
    hidePin: 'Hide PIN',
    showRecipient: 'Show recipient',
    hideRecipient: 'Hide recipient',
    settingsTitle: 'Draw settings',
    settingsDesc: "The draw link can't be changed.",
    newAdminPin: 'New organizer PIN (optional)',
    newAdminPinHint: 'Leave empty to keep the current PIN.',
    settingsSaved: 'Changes saved',
    adminLoggedIn: 'Welcome, organizer',

    err_unauthorized: 'Not authorized. Please sign in again.',
    err_not_found: 'Not found.',
    err_rate_limited: 'Too many failed attempts. Wait 15 minutes and try again.',
    err_invalid_pin: 'Wrong PIN.',
    err_invalid_pin_format: 'The PIN must be 4 to 8 digits.',
    err_invalid_name: 'Names must be 1 to 60 characters.',
    err_duplicate_name: 'There is already a participant called "{detail}".',
    err_too_many_participants: 'Participant limit reached.',
    err_already_drawn: "The draw is done. Use 'Add a late participant'.",
    err_not_drawn: "The draw hasn't been run yet.",
    err_min_3: 'At least 3 participants are required.',
    err_invalid_text: 'Suggestions must be 1 to 200 characters.',
    err_too_many_items: "You've reached the limit of 50 suggestions.",
    err_invalid_budget: 'Invalid budget.',
    err_pin_in_use: 'A participant already uses this PIN.',
    err_generic: 'Something went wrong. Please try again.',
  },
};

const STORAGE_KEY = 'amic-invisible:lang';
const SUPPORTED = Object.keys(translations);

function initialLang() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (SUPPORTED.includes(saved)) return saved;
  } catch { /* storage unavailable */ }
  return 'ca';
}

const I18nContext = createContext(null);

export function I18nProvider({ children }) {
  const [lang, setLang] = useState(initialLang);

  useEffect(() => {
    document.documentElement.lang = lang;
    try { localStorage.setItem(STORAGE_KEY, lang); } catch { /* ignore */ }
  }, [lang]);

  const t = useCallback((key, vars) => {
    const str = translations[lang][key] ?? translations.ca[key] ?? key;
    if (!vars) return str;
    return str.replace(/\{(\w+)\}/g, (m, k) => (vars[k] ?? m));
  }, [lang]);

  // Translates an ApiError (or anything thrown) into a user-facing message.
  const tError = useCallback((err) => {
    const code = err?.code && translations[lang][`err_${err.code}`] ? err.code : 'generic';
    return t(`err_${code}`, { detail: err?.detail ?? '' });
  }, [lang, t]);

  const formatMoney = useCallback((n) => (
    n == null ? '' : new Intl.NumberFormat(lang, { style: 'currency', currency: 'EUR' }).format(n)
  ), [lang]);

  const formatDate = useCallback((iso) => {
    if (!iso) return '';
    const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
    return new Intl.DateTimeFormat(lang, { dateStyle: 'long' }).format(new Date(y, m - 1, d));
  }, [lang]);

  const value = useMemo(() => ({
    lang, setLang, t, tError, formatMoney, formatDate,
    toggleLang: () => setLang((l) => (l === 'ca' ? 'en' : 'ca')),
  }), [lang, t, tError, formatMoney, formatDate]);

  return createElement(I18nContext.Provider, { value }, children);
}

export function useI18n() {
  return useContext(I18nContext);
}
