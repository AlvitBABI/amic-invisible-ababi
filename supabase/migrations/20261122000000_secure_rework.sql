-- Secure rework of Amic Invisible.
-- Drops all existing data and recreates the schema. Tables have RLS enabled with
-- no policies and no table privileges for anon/authenticated: every read/write
-- goes through the SECURITY DEFINER RPCs below.
--
-- PINs: participant PINs are 4 digits, admin PIN 4-8 digits, unique per draw.
-- Each PIN is stored as a bcrypt hash (used for login) plus a copy encrypted
-- with the draw's admin_token (pgp_sym_encrypt), so only the holder of the
-- admin token can read participant PINs. Nothing is stored in plain text.

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- Drop old schema + data
-- ---------------------------------------------------------------------------
drop table if exists public.wishlist_items cascade;
drop table if exists public.participants cascade;
drop table if exists public.login_attempts cascade;
drop table if exists public.draws cascade;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table public.draws (
  id             uuid primary key default gen_random_uuid(),
  slug           text not null unique
                 check (char_length(slug) <= 60 and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  admin_pin_hash text not null,
  admin_token    uuid not null unique default gen_random_uuid(),
  budget         numeric(10,2) check (budget >= 0),
  event_date     date,
  drawn_at       timestamptz,
  created_at     timestamptz not null default now()
);

create table public.participants (
  id           uuid primary key default gen_random_uuid(),
  draw_id      uuid not null references public.draws(id) on delete cascade,
  name         text not null check (char_length(name) between 1 and 60 and name = btrim(name)),
  pin_hash     text not null,
  pin_enc      bytea not null,
  recipient_id uuid,
  created_at   timestamptz not null default now(),
  constraint participants_draw_id_id_key unique (draw_id, id),
  -- recipient must belong to the same draw
  constraint participants_recipient_fkey foreign key (draw_id, recipient_id)
    references public.participants (draw_id, id) on delete set null (recipient_id),
  constraint participants_no_self check (recipient_id is null or recipient_id <> id),
  -- nobody receives two gifts (deferred so reassignments can swap within a transaction)
  constraint participants_recipient_unique unique (recipient_id) deferrable initially deferred
);
create unique index participants_draw_name_key on public.participants (draw_id, lower(name));
create index participants_draw_recipient_idx on public.participants (draw_id, recipient_id);

create table public.wishlist_items (
  id             uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.participants(id) on delete cascade,
  item_text      text not null check (char_length(item_text) between 1 and 200),
  created_at     timestamptz not null default now()
);
create index wishlist_items_participant_idx on public.wishlist_items (participant_id);

-- failed login attempts, used for rate limiting
create table public.login_attempts (
  id           bigint generated always as identity primary key,
  draw_id      uuid not null references public.draws(id) on delete cascade,
  attempted_at timestamptz not null default now()
);
create index login_attempts_draw_time_idx on public.login_attempts (draw_id, attempted_at);
create index login_attempts_time_idx on public.login_attempts (attempted_at);

alter table public.draws          enable row level security;
alter table public.participants   enable row level security;
alter table public.wishlist_items enable row level security;
alter table public.login_attempts enable row level security;

revoke all on table public.draws, public.participants, public.wishlist_items, public.login_attempts
  from public, anon, authenticated;
revoke all on sequence public.login_attempts_id_seq from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Private helpers (not exposed through the API)
-- ---------------------------------------------------------------------------
create function private.new_pin() returns text
language sql volatile set search_path = '' as $$
  select lpad((((get_byte(b,0)::bigint << 16) + (get_byte(b,1) << 8) + get_byte(b,2)) % 10000)::text, 4, '0')
  from (select extensions.gen_random_bytes(3) as b) s
$$;

create function private.hash_pin(p_pin text) returns text
language sql volatile set search_path = '' as $$
  select extensions.crypt(p_pin, extensions.gen_salt('bf', 8))
$$;

create function private.enc_pin(p_pin text, p_key uuid) returns bytea
language sql volatile set search_path = '' as $$
  select extensions.pgp_sym_encrypt(p_pin, p_key::text, 'cipher-algo=aes256')
$$;

create function private.dec_pin(p_enc bytea, p_key uuid) returns text
language sql stable set search_path = '' as $$
  select extensions.pgp_sym_decrypt(p_enc, p_key::text)
$$;

-- Authenticates the admin by slug + token and locks the draw row so admin
-- operations on one draw are serialized.
create function private.auth_admin(p_slug text, p_token uuid) returns public.draws
language plpgsql set search_path = '' as $$
declare d public.draws;
begin
  select * into d from public.draws where slug = p_slug and admin_token = p_token for update;
  if not found then raise exception 'unauthorized' using errcode = '28000'; end if;
  return d;
end $$;

-- All participant PINs currently used in a draw (decrypted with the admin token).
create function private.used_pins(d public.draws) returns text[]
language sql stable set search_path = '' as $$
  select coalesce(array_agg(private.dec_pin(p.pin_enc, d.admin_token)), '{}')
  from public.participants p where p.draw_id = d.id
$$;

-- A fresh participant PIN that collides neither with `used` nor with the admin PIN.
create function private.unique_pin(d public.draws, used text[]) returns text
language plpgsql volatile set search_path = '' as $$
declare v text;
begin
  if cardinality(used) >= 9000 then raise exception 'too_many_participants'; end if;
  loop
    v := private.new_pin();
    if not (v = any(used)) and extensions.crypt(v, d.admin_pin_hash) <> d.admin_pin_hash then
      return v;
    end if;
  end loop;
end $$;

create function private.clean_name(p_name text) returns text
language plpgsql immutable set search_path = '' as $$
declare v text := btrim(regexp_replace(coalesce(p_name, ''), '\s+', ' ', 'g'));
begin
  if char_length(v) < 1 or char_length(v) > 60 then
    raise exception 'invalid_name' using detail = coalesce(p_name, '');
  end if;
  return v;
end $$;

-- Inserts a participant with a fresh PIN. Caller must hold the draw lock.
create function private.insert_participant(d public.draws, p_name text, used text[], out o_id uuid, out o_name text, out o_pin text)
language plpgsql volatile set search_path = '' as $$
begin
  o_name := private.clean_name(p_name);
  if exists (select 1 from public.participants p where p.draw_id = d.id and lower(p.name) = lower(o_name)) then
    raise exception 'duplicate_name' using detail = o_name;
  end if;
  if (select count(*) from public.participants p where p.draw_id = d.id) >= 100 then
    raise exception 'too_many_participants';
  end if;
  o_pin := private.unique_pin(d, used);
  insert into public.participants (draw_id, name, pin_hash, pin_enc)
  values (d.id, o_name, private.hash_pin(o_pin), private.enc_pin(o_pin, d.admin_token))
  returning id into o_id;
end $$;

-- Checks a PIN against the admin PIN and every participant PIN of a draw.
-- Failed attempts are recorded; 10 failures per draw in 15 minutes locks login.
-- Returns o_kind = 'admin' | 'participant' | null (wrong PIN).
create function private.authenticate(p_slug text, p_pin text, out o_kind text, out o_draw_id uuid, out o_participant_id uuid)
language plpgsql volatile set search_path = '' as $$
declare
  d public.draws;
  v_fails int;
  r record;
begin
  select * into d from public.draws where slug = p_slug;
  if not found then raise exception 'not_found'; end if;
  o_draw_id := d.id;

  select count(*) into v_fails from public.login_attempts a
  where a.draw_id = d.id and a.attempted_at > now() - interval '15 minutes';
  if v_fails >= 10 then raise exception 'rate_limited'; end if;

  if coalesce(p_pin, '') ~ '^[0-9]{4,8}$' then
    if extensions.crypt(p_pin, d.admin_pin_hash) = d.admin_pin_hash then
      o_kind := 'admin';
      return;
    end if;
    for r in select p.id, p.pin_hash from public.participants p where p.draw_id = d.id loop
      if extensions.crypt(p_pin, r.pin_hash) = r.pin_hash then
        o_kind := 'participant';
        o_participant_id := r.id;
        return;
      end if;
    end loop;
  end if;

  insert into public.login_attempts (draw_id) values (d.id);
  delete from public.login_attempts a where a.attempted_at < now() - interval '1 day';
end $$;

create function private.participant_payload(p_participant_id uuid) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'role', 'participant',
    'name', p.name,
    'recipient_name', r.name,
    'recipient_wishlist', coalesce((
      select jsonb_agg(jsonb_build_object('text', w.item_text) order by w.created_at)
      from public.wishlist_items w where w.participant_id = r.id), '[]'::jsonb),
    'my_wishlist', coalesce((
      select jsonb_agg(jsonb_build_object('id', w.id, 'text', w.item_text) order by w.created_at)
      from public.wishlist_items w where w.participant_id = p.id), '[]'::jsonb),
    'draw', jsonb_build_object('slug', d.slug, 'budget', d.budget, 'event_date', d.event_date, 'drawn_at', d.drawn_at)
  )
  from public.participants p
  join public.draws d on d.id = p.draw_id
  left join public.participants r on r.id = p.recipient_id
  where p.id = p_participant_id
$$;

create function private.admin_payload(d public.draws) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'draw', jsonb_build_object(
      'slug', d.slug, 'budget', d.budget, 'event_date', d.event_date,
      'drawn_at', d.drawn_at, 'admin_token', d.admin_token),
    'participants', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id,
        'name', p.name,
        'pin', private.dec_pin(p.pin_enc, d.admin_token),
        'recipient_name', r.name,
        'wish_count', (select count(*) from public.wishlist_items w where w.participant_id = p.id)
      ) order by p.created_at, p.name)
      from public.participants p
      left join public.participants r on r.id = p.recipient_id
      where p.draw_id = d.id), '[]'::jsonb)
  )
$$;

-- ---------------------------------------------------------------------------
-- Public RPCs
-- ---------------------------------------------------------------------------

-- Public info shown on the login screen.
create function public.get_draw(p_slug text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('slug', d.slug, 'budget', d.budget, 'event_date', d.event_date, 'drawn_at', d.drawn_at)
  from public.draws d where d.slug = p_slug
$$;

create function public.create_draw(p_name text, p_admin_pin text, p_budget numeric default null, p_event_date date default null)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  v_base text;
  v_slug text;
  d public.draws;
begin
  if coalesce(p_admin_pin, '') !~ '^[0-9]{4,8}$' then raise exception 'invalid_pin_format'; end if;
  if p_budget is not null and (p_budget < 0 or p_budget > 99999999) then raise exception 'invalid_budget'; end if;
  v_base := private.clean_name(p_name);
  v_base := translate(lower(v_base), 'àáâäãèéêëìíîïòóôöõùúûüçñ·ŀ', 'aaaaaeeeeiiiiooooouuuucn-l');
  v_base := left(btrim(regexp_replace(v_base, '[^a-z0-9]+', '-', 'g'), '-'), 40);
  v_base := btrim(v_base, '-');
  if v_base = '' then v_base := 'sorteig'; end if;

  loop
    v_slug := v_base || '-' || encode(extensions.gen_random_bytes(3), 'hex');
    begin
      insert into public.draws (slug, admin_pin_hash, budget, event_date)
      values (v_slug, private.hash_pin(p_admin_pin), p_budget, p_event_date)
      returning * into d;
      exit;
    exception when unique_violation then
      -- slug collision, try another suffix
    end;
  end loop;

  return jsonb_build_object('slug', d.slug, 'admin_token', d.admin_token);
end $$;

-- Single login entry point. Returns either the participant's own data or,
-- for the admin PIN, the admin token. Wrong PINs return {"error":"invalid_pin"}
-- (not an exception, so the failed attempt is recorded).
create function public.participant_login(p_slug text, p_pin text)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare a record;
begin
  select * into a from private.authenticate(p_slug, p_pin);
  if a.o_kind is null then return jsonb_build_object('error', 'invalid_pin'); end if;
  if a.o_kind = 'admin' then
    return jsonb_build_object('role', 'admin',
      'admin_token', (select d.admin_token from public.draws d where d.id = a.o_draw_id));
  end if;
  return private.participant_payload(a.o_participant_id);
end $$;

create function public.add_wish(p_slug text, p_pin text, p_text text)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  a record;
  v_text text := btrim(coalesce(p_text, ''));
  v_id uuid;
begin
  select * into a from private.authenticate(p_slug, p_pin);
  if a.o_kind is distinct from 'participant' then return jsonb_build_object('error', 'invalid_pin'); end if;
  if char_length(v_text) < 1 or char_length(v_text) > 200 then raise exception 'invalid_text'; end if;
  if (select count(*) from public.wishlist_items w where w.participant_id = a.o_participant_id) >= 50 then
    raise exception 'too_many_items';
  end if;
  insert into public.wishlist_items (participant_id, item_text) values (a.o_participant_id, v_text)
  returning id into v_id;
  return jsonb_build_object('id', v_id, 'text', v_text);
end $$;

create function public.remove_wish(p_slug text, p_pin text, p_item_id uuid)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare a record;
begin
  select * into a from private.authenticate(p_slug, p_pin);
  if a.o_kind is distinct from 'participant' then return jsonb_build_object('error', 'invalid_pin'); end if;
  delete from public.wishlist_items w where w.id = p_item_id and w.participant_id = a.o_participant_id;
  return jsonb_build_object('ok', true);
end $$;

create function public.admin_get(p_slug text, p_token uuid)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare d public.draws;
begin
  d := private.auth_admin(p_slug, p_token);
  return private.admin_payload(d);
end $$;

-- Adds participants before the draw. Returns [{id, name, pin}] (plain PINs).
create function public.admin_add_participants(p_slug text, p_token uuid, p_names text[])
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  d public.draws;
  v_used text[];
  v_name text;
  r record;
  v_out jsonb := '[]'::jsonb;
begin
  d := private.auth_admin(p_slug, p_token);
  if d.drawn_at is not null then raise exception 'already_drawn'; end if;
  v_used := private.used_pins(d);
  foreach v_name in array coalesce(p_names, '{}') loop
    continue when btrim(coalesce(v_name, '')) = '';
    select * into r from private.insert_participant(d, v_name, v_used);
    v_used := v_used || r.o_pin;
    v_out := v_out || jsonb_build_object('id', r.o_id, 'name', r.o_name, 'pin', r.o_pin);
  end loop;
  return v_out;
end $$;

-- Removes a participant. After the draw, the person who gave to them now gives
-- to their recipient. If that would leave fewer than 3 people or create a
-- mutual pair, the draw is reset and must be run again.
create function public.admin_remove_participant(p_slug text, p_token uuid, p_participant_id uuid)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  d public.draws;
  p public.participants;
  v_giver uuid;
  v_reset boolean := false;
begin
  d := private.auth_admin(p_slug, p_token);
  select * into p from public.participants x where x.id = p_participant_id and x.draw_id = d.id;
  if not found then raise exception 'not_found'; end if;

  if d.drawn_at is not null then
    select x.id into v_giver from public.participants x where x.draw_id = d.id and x.recipient_id = p.id;
    if v_giver is null or p.recipient_id is null
       or (select count(*) from public.participants x where x.draw_id = d.id) - 1 < 3
       or (select x.recipient_id from public.participants x where x.id = p.recipient_id) = v_giver then
      v_reset := true;
    else
      update public.participants set recipient_id = p.recipient_id where id = v_giver;
    end if;
  end if;

  delete from public.participants where id = p.id;

  if v_reset then
    update public.participants set recipient_id = null where draw_id = d.id;
    update public.draws set drawn_at = null where id = d.id;
  end if;
  return jsonb_build_object('draw_reset', v_reset);
end $$;

create function public.admin_update_settings(p_slug text, p_token uuid, p_budget numeric, p_event_date date, p_new_admin_pin text default null)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare d public.draws;
begin
  d := private.auth_admin(p_slug, p_token);
  if p_budget is not null and (p_budget < 0 or p_budget > 99999999) then raise exception 'invalid_budget'; end if;
  if nullif(p_new_admin_pin, '') is not null then
    if p_new_admin_pin !~ '^[0-9]{4,8}$' then raise exception 'invalid_pin_format'; end if;
    if p_new_admin_pin = any(private.used_pins(d)) then raise exception 'pin_in_use'; end if;
    update public.draws set admin_pin_hash = private.hash_pin(p_new_admin_pin) where id = d.id;
  end if;
  update public.draws set budget = p_budget, event_date = p_event_date where id = d.id;
  select * into d from public.draws where id = d.id;
  return private.admin_payload(d);
end $$;

create function public.admin_reset_pin(p_slug text, p_token uuid, p_participant_id uuid)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  d public.draws;
  v_pin text;
begin
  d := private.auth_admin(p_slug, p_token);
  if not exists (select 1 from public.participants x where x.id = p_participant_id and x.draw_id = d.id) then
    raise exception 'not_found';
  end if;
  v_pin := private.unique_pin(d, private.used_pins(d));
  update public.participants
  set pin_hash = private.hash_pin(v_pin), pin_enc = private.enc_pin(v_pin, d.admin_token)
  where id = p_participant_id;
  return jsonb_build_object('pin', v_pin);
end $$;

-- Atomic draw: shuffle everyone into a single random cycle, each person gives
-- to the next. With 3+ people this guarantees no self-gifts and no mutual pairs.
-- Running it again reshuffles.
create function public.admin_run_draw(p_slug text, p_token uuid)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  d public.draws;
  v_n int;
begin
  d := private.auth_admin(p_slug, p_token);
  select count(*) into v_n from public.participants x where x.draw_id = d.id;
  if v_n < 3 then raise exception 'min_3'; end if;

  with ordered as (
    select x.id, row_number() over (order by gen_random_uuid()) as rn
    from public.participants x where x.draw_id = d.id
  )
  update public.participants p
  set recipient_id = o2.id
  from ordered o1
  join ordered o2 on o2.rn = (o1.rn % v_n) + 1
  where p.id = o1.id;

  update public.draws set drawn_at = now() where id = d.id;
  select * into d from public.draws where id = d.id;
  return private.admin_payload(d);
end $$;

-- Adds someone after the draw without reshuffling: a random A who gave to B
-- now gives to New, and New gives to B. Returns {id, name, pin}.
create function public.admin_add_late_participant(p_slug text, p_token uuid, p_name text)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  d public.draws;
  r record;
  v_a uuid;
  v_b uuid;
begin
  d := private.auth_admin(p_slug, p_token);
  if d.drawn_at is null then raise exception 'not_drawn'; end if;
  select * into r from private.insert_participant(d, p_name, private.used_pins(d));

  select x.id, x.recipient_id into v_a, v_b
  from public.participants x
  where x.draw_id = d.id and x.id <> r.o_id and x.recipient_id is not null
  order by gen_random_uuid() limit 1;
  if v_a is null then raise exception 'not_drawn'; end if;

  update public.participants set recipient_id = v_b where id = r.o_id;
  update public.participants set recipient_id = r.o_id where id = v_a;
  return jsonb_build_object('id', r.o_id, 'name', r.o_name, 'pin', r.o_pin);
end $$;

-- ---------------------------------------------------------------------------
-- Function privileges
-- ---------------------------------------------------------------------------
revoke all on all functions in schema private from public, anon, authenticated;

revoke all on function
  public.get_draw(text),
  public.create_draw(text, text, numeric, date),
  public.participant_login(text, text),
  public.add_wish(text, text, text),
  public.remove_wish(text, text, uuid),
  public.admin_get(text, uuid),
  public.admin_add_participants(text, uuid, text[]),
  public.admin_remove_participant(text, uuid, uuid),
  public.admin_update_settings(text, uuid, numeric, date, text),
  public.admin_reset_pin(text, uuid, uuid),
  public.admin_run_draw(text, uuid),
  public.admin_add_late_participant(text, uuid, text)
from public;

grant execute on function
  public.get_draw(text),
  public.create_draw(text, text, numeric, date),
  public.participant_login(text, text),
  public.add_wish(text, text, text),
  public.remove_wish(text, text, uuid),
  public.admin_get(text, uuid),
  public.admin_add_participants(text, uuid, text[]),
  public.admin_remove_participant(text, uuid, uuid),
  public.admin_update_settings(text, uuid, numeric, date, text),
  public.admin_reset_pin(text, uuid, uuid),
  public.admin_run_draw(text, uuid),
  public.admin_add_late_participant(text, uuid, text)
to anon, authenticated;
