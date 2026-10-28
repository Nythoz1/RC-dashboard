-- 0018: a quote link the customer opens without a login.
--
-- The dashboard stays private. A quote link shows one quote and nothing else: the shop's name and
-- contact details, the quote number, date, description, line items and totals with tax, and lets
-- the customer approve it (typing their name) or decline it, once.
--
--   quote_links          one row per link: the shop, the quote id, a SHA-256 hash of the token
--                        (the token itself is never stored), who made it, when it expires (30 days
--                        by default, 90 at most), views, and the customer's answer.
--   quote_link_make()    owner / office staff: a new link for one of their shop's quotes; the
--                        quote's earlier unanswered links stop working. Returns the token once.
--   quote_link_revoke()  owner / office staff: every open link for that quote stops working.
--   quote_view(token)    anyone with the token: that quote, nothing else (no costs, no notes, no
--                        other records). Counts the view.
--   quote_decide(token, approved|declined, name, note)
--                        anyone with the token, once: sets the quote's status and custDecision in
--                        the shop's rc:quotes and writes a Shop Log entry (user "customer"), under
--                        the row locks, so a save from the dashboard merges with it.
-- Needs 0017 (tenant_state, current_tenant). Only create / create-or-replace / alter / grant /
-- revoke, so it goes straight through the Supabase MCP.

create table if not exists public.quote_links (
  token_hash    text primary key,
  tenant_id     uuid not null references public.tenants(id) on delete cascade,
  quote_id      text not null,
  created_by    text not null default '',
  created_at    timestamptz not null default now(),
  expires_at    timestamptz not null,
  revoked       boolean not null default false,
  views         integer not null default 0,
  viewed_at     timestamptz,
  decided_at    timestamptz,
  decision      text check (decision in ('approved', 'declined')),
  decided_name  text,
  decided_note  text
);
create index if not exists quote_links_quote_idx on public.quote_links (tenant_id, quote_id);
alter table public.quote_links enable row level security;
create policy "quote_links: shop staff read" on public.quote_links
  for select to authenticated
  using (tenant_id = (select public.current_tenant()) and ((select public.is_owner()) or (select public.is_staff())));
grant select on public.quote_links to authenticated;

create or replace function public.ql_hash(p text) returns text
language sql immutable set search_path = '' as
$$ select encode(sha256(convert_to(coalesce(p, ''), 'UTF8')), 'hex') $$;

create or replace function public.quote_link_make(p_quote_id text, p_days integer default 30) returns text
language plpgsql security definer set search_path = '' as $$
declare
  shop uuid := public.current_tenant();
  tok text;
begin
  if shop is null or not (public.is_owner() or public.is_staff()) then
    raise exception 'Only the shop''s owner or office can share a quote' using errcode = '42501';
  end if;
  if not exists (select 1 from public.tenant_state s, jsonb_array_elements(case when jsonb_typeof(s.value) = 'array' then s.value else '[]'::jsonb end) e
                 where s.tenant_id = shop and s.key = 'rc:quotes' and e ->> 'id' = p_quote_id) then
    raise exception 'That quote isn''t saved yet. Wait a moment and try again.' using errcode = 'P0001';
  end if;
  update public.quote_links set revoked = true
   where tenant_id = shop and quote_id = p_quote_id and decided_at is null and not revoked;
  tok := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
  insert into public.quote_links (token_hash, tenant_id, quote_id, created_by, expires_at)
  values (public.ql_hash(tok), shop, p_quote_id, coalesce(auth.jwt() ->> 'email', ''),
          now() + make_interval(days => greatest(1, least(coalesce(p_days, 30), 90))));
  return tok;
end $$;
revoke all on function public.quote_link_make(text, integer) from public, anon;
grant execute on function public.quote_link_make(text, integer) to authenticated;

create or replace function public.quote_link_revoke(p_quote_id text) returns integer
language plpgsql security definer set search_path = '' as $$
declare n integer;
begin
  if public.current_tenant() is null or not (public.is_owner() or public.is_staff()) then
    raise exception 'Only the shop''s owner or office can do that' using errcode = '42501';
  end if;
  update public.quote_links set revoked = true
   where tenant_id = public.current_tenant() and quote_id = p_quote_id and not revoked;
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public.quote_link_revoke(text) from public, anon;
grant execute on function public.quote_link_revoke(text) to authenticated;

-- What the customer sees: built field by field, so nothing else on the quote (or in the shop) leaks.
create or replace function public.quote_view(p_token text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  l public.quote_links;
  q jsonb;
  t public.tenants;
  cust text;
  items jsonb;
  sub numeric;
  rate numeric;
  tax numeric;
begin
  select * into l from public.quote_links where token_hash = public.ql_hash(p_token);
  if not found or l.revoked then return jsonb_build_object('error', 'gone'); end if;
  if l.expires_at < now() and l.decided_at is null then return jsonb_build_object('error', 'expired'); end if;
  select e into q from public.tenant_state s, jsonb_array_elements(case when jsonb_typeof(s.value) = 'array' then s.value else '[]'::jsonb end) e
   where s.tenant_id = l.tenant_id and s.key = 'rc:quotes' and e ->> 'id' = l.quote_id limit 1;
  if q is null then return jsonb_build_object('error', 'gone'); end if;
  select * into t from public.tenants where id = l.tenant_id;
  select e ->> 'name' into cust from public.tenant_state s, jsonb_array_elements(case when jsonb_typeof(s.value) = 'array' then s.value else '[]'::jsonb end) e
   where s.tenant_id = l.tenant_id and s.key = 'rc:customers' and e ->> 'id' = q ->> 'custId' limit 1;
  select coalesce(jsonb_agg(jsonb_build_object('d', coalesce(i ->> 'd', ''), 'q', public.rc_num(i -> 'q'), 'r', public.rc_num(i -> 'r')) order by o), '[]'::jsonb),
         round(coalesce(sum(coalesce(public.rc_num(i -> 'q'), 0) * coalesce(public.rc_num(i -> 'r'), 0)), 0), 2)
    into items, sub
    from jsonb_array_elements(case when jsonb_typeof(q -> 'items') = 'array' then q -> 'items' else '[]'::jsonb end) with ordinality as x(i, o)
   where coalesce(i ->> 'd', '') <> '';
  rate := coalesce(public.rc_num(q -> 'taxRate'), 0.05);
  tax := round(sub * rate, 2);
  update public.quote_links set views = views + 1, viewed_at = coalesce(viewed_at, now()) where token_hash = l.token_hash;
  return jsonb_build_object(
    'shop', jsonb_build_object('name', t.name, 'tagline', coalesce(t.profile ->> 'tagline', ''), 'phone', coalesce(t.profile ->> 'phone', ''),
                               'address', coalesce(t.profile ->> 'address', ''), 'site', coalesce(t.profile ->> 'site', ''), 'email', coalesce(t.profile ->> 'email', '')),
    'quote', jsonb_build_object('num', coalesce(q ->> 'quoteNum', ''), 'date', coalesce(q ->> 'date', ''), 'validUntil', coalesce(q ->> 'validUntil', ''),
                                'description', coalesce(q ->> 'description', ''), 'customer', coalesce(cust, ''), 'items', items,
                                'sub', sub, 'taxRate', rate, 'tax', tax, 'total', sub + tax, 'status', coalesce(q ->> 'status', 'draft')),
    'decision', case when l.decided_at is null then null else
                jsonb_build_object('decision', l.decision, 'name', l.decided_name, 'at', l.decided_at) end,
    'expires', l.expires_at);
end $$;
revoke all on function public.quote_view(text) from public;
grant execute on function public.quote_view(text) to anon, authenticated;

create or replace function public.quote_decide(p_token text, p_decision text, p_name text, p_note text default '') returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  l public.quote_links;
  arr jsonb;
  idx integer;
  q jsonb;
  nm text := left(btrim(coalesce(p_name, '')), 80);
  nt text := left(btrim(coalesce(p_note, '')), 500);
  act jsonb;
begin
  if p_decision not in ('approved', 'declined') then return jsonb_build_object('error', 'bad'); end if;
  if p_decision = 'approved' and nm = '' then return jsonb_build_object('error', 'name'); end if;
  select * into l from public.quote_links where token_hash = public.ql_hash(p_token) for update;
  if not found or l.revoked then return jsonb_build_object('error', 'gone'); end if;
  if l.decided_at is not null then return jsonb_build_object('error', 'decided'); end if;
  if l.expires_at < now() then return jsonb_build_object('error', 'expired'); end if;
  select value into arr from public.tenant_state where tenant_id = l.tenant_id and key = 'rc:quotes' for update;
  select (o - 1)::int, e into idx, q from jsonb_array_elements(case when jsonb_typeof(arr) = 'array' then arr else '[]'::jsonb end) with ordinality as x(e, o)
   where e ->> 'id' = l.quote_id limit 1;
  if idx is null then return jsonb_build_object('error', 'gone'); end if;
  if coalesce(q ->> 'status', '') = 'invoiced' then return jsonb_build_object('error', 'invoiced'); end if;
  q := q || jsonb_build_object('status', p_decision,
         'custDecision', jsonb_build_object('decision', p_decision, 'name', nm, 'note', nt, 'at', to_char(now() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'), 'via', 'link'));
  update public.tenant_state set value = jsonb_set(arr, array[idx::text], q), updated_at = now()
   where tenant_id = l.tenant_id and key = 'rc:quotes';
  act := jsonb_build_object('id', floor(extract(epoch from clock_timestamp()) * 1000)::bigint, 'ts', to_char(now() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
           'user', 'customer', 'type', 'quote',
           'msg', case when p_decision = 'approved' then '✅ Quote ' else '✖ Quote ' end || coalesce(nullif(q ->> 'quoteNum', ''), 'quote') ||
                  case when p_decision = 'approved' then ' approved by ' || nm else ' declined' || case when nm <> '' then ' by ' || nm else '' end end ||
                  ' through the customer link' || case when nt <> '' then ': ' || nt else '' end);
  insert into public.tenant_state (tenant_id, key, value) values (l.tenant_id, 'rc:activity', jsonb_build_array(act))
  on conflict (tenant_id, key) do update
    set value = (select coalesce(jsonb_agg(e order by o), '[]'::jsonb) from jsonb_array_elements(jsonb_build_array(act) || case when jsonb_typeof(public.tenant_state.value) = 'array' then public.tenant_state.value else '[]'::jsonb end) with ordinality as y(e, o) where o <= 400),
        updated_at = now();
  update public.quote_links set decided_at = now(), decision = p_decision, decided_name = nm, decided_note = nt where token_hash = l.token_hash;
  return public.quote_view(p_token);
end $$;
revoke all on function public.quote_decide(text, text, text, text) from public;
grant execute on function public.quote_decide(text, text, text, text) to anon, authenticated;
