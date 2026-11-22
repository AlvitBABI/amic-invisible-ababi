import { createClient } from '@supabase/supabase-js';

// Publishable key: safe to ship. All data access goes through SECURITY DEFINER
// RPCs; the tables themselves are not readable with this key.
const SUPABASE_URL = 'https://wxtmedefbfsklfcqeuna.supabase.co';
const SUPABASE_KEY = 'sb_publishable__WbCTrsXTmcrpDurJx5mXQ_MaEE6v6u';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Error codes raised by the database functions (see supabase/migrations).
const KNOWN_ERRORS = new Set([
  'unauthorized', 'not_found', 'rate_limited', 'invalid_pin', 'invalid_pin_format',
  'invalid_name', 'duplicate_name', 'too_many_participants', 'already_drawn',
  'not_drawn', 'min_3', 'invalid_text', 'too_many_items', 'invalid_budget', 'pin_in_use',
]);

export class ApiError extends Error {
  constructor(code, detail) {
    super(code);
    this.code = code;
    this.detail = detail;
  }
}

async function call(fn, args) {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) {
    const code = KNOWN_ERRORS.has(error.message)
      ? error.message
      : error.code === '28000' ? 'unauthorized' : 'generic';
    throw new ApiError(code, error.details);
  }
  if (data && typeof data === 'object' && !Array.isArray(data) && data.error) {
    throw new ApiError(KNOWN_ERRORS.has(data.error) ? data.error : 'generic');
  }
  return data;
}

const toBudget = (v) => (v === '' || v == null ? null : Number(v));
const toDate = (v) => v || null;

export const api = {
  getDraw: (slug) => call('get_draw', { p_slug: slug }),

  createDraw: ({ name, adminPin, budget, eventDate }) =>
    call('create_draw', {
      p_name: name,
      p_admin_pin: adminPin,
      p_budget: toBudget(budget),
      p_event_date: toDate(eventDate),
    }),

  // Returns { role: 'admin', admin_token } or { role: 'participant', name, recipient_name, ... }
  login: (slug, pin) => call('participant_login', { p_slug: slug, p_pin: pin }),

  addWish: (slug, pin, text) => call('add_wish', { p_slug: slug, p_pin: pin, p_text: text }),
  removeWish: (slug, pin, itemId) => call('remove_wish', { p_slug: slug, p_pin: pin, p_item_id: itemId }),

  adminGet: (slug, token) => call('admin_get', { p_slug: slug, p_token: token }),
  adminAddParticipants: (slug, token, names) =>
    call('admin_add_participants', { p_slug: slug, p_token: token, p_names: names }),
  adminRemoveParticipant: (slug, token, id) =>
    call('admin_remove_participant', { p_slug: slug, p_token: token, p_participant_id: id }),
  adminUpdateSettings: (slug, token, { budget, eventDate, newAdminPin }) =>
    call('admin_update_settings', {
      p_slug: slug,
      p_token: token,
      p_budget: toBudget(budget),
      p_event_date: toDate(eventDate),
      p_new_admin_pin: newAdminPin || null,
    }),
  adminResetPin: (slug, token, id) =>
    call('admin_reset_pin', { p_slug: slug, p_token: token, p_participant_id: id }),
  adminRunDraw: (slug, token) => call('admin_run_draw', { p_slug: slug, p_token: token }),
  adminAddLateParticipant: (slug, token, name) =>
    call('admin_add_late_participant', { p_slug: slug, p_token: token, p_name: name }),
};
