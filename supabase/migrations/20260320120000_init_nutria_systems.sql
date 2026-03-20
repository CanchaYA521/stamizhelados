create extension if not exists pgcrypto;

create type public.payment_method as enum ('cash', 'yape');
create type public.cash_session_status as enum ('open', 'closed');
create type public.sale_status as enum ('completed', 'voided');
create type public.void_resolution_mode as enum ('current_session', 'original_session');

create or replace function public.set_current_timestamp()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'Nutria Systems',
  created_at timestamptz not null default timezone('utc', now())
);

create unique index businesses_owner_user_id_key on public.businesses (owner_user_id);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  full_name text,
  email text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create trigger set_profiles_timestamp
before update on public.profiles
for each row
execute function public.set_current_timestamp();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  new_business_id uuid;
begin
  insert into public.businesses (owner_user_id, name)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'business_name', ''), 'Nutria Systems')
  )
  on conflict (owner_user_id) do update
  set name = excluded.name
  returning id into new_business_id;

  insert into public.profiles (id, business_id, full_name, email)
  values (
    new.id,
    new_business_id,
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    new.email
  )
  on conflict (id) do update
  set
    business_id = excluded.business_id,
    full_name = coalesce(excluded.full_name, public.profiles.full_name),
    email = excluded.email,
    updated_at = timezone('utc', now());

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

create or replace function public.current_business_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select business_id
  from public.profiles
  where id = auth.uid();
$$;

create table public.products (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null default public.current_business_id() references public.businesses(id) on delete cascade,
  name text not null,
  category text,
  base_price numeric(12, 2) not null check (base_price >= 0),
  active boolean not null default true,
  display_order integer not null default 0 check (display_order >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index products_business_order_idx on public.products (business_id, display_order, name);

create trigger set_products_timestamp
before update on public.products
for each row
execute function public.set_current_timestamp();

create table public.cash_sessions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null default public.current_business_id() references public.businesses(id) on delete cascade,
  opened_by uuid not null default auth.uid() references auth.users(id),
  opening_amount numeric(12, 2) not null check (opening_amount >= 0),
  status public.cash_session_status not null default 'open',
  opened_at timestamptz not null default timezone('utc', now()),
  closed_at timestamptz,
  counted_cash numeric(12, 2),
  created_at timestamptz not null default timezone('utc', now())
);

create unique index cash_sessions_one_open_per_business_idx
on public.cash_sessions (business_id)
where status = 'open';

create index cash_sessions_business_opened_at_idx on public.cash_sessions (business_id, opened_at desc);

create table public.sales (
  id uuid primary key,
  business_id uuid not null default public.current_business_id() references public.businesses(id) on delete cascade,
  session_id uuid not null references public.cash_sessions(id) on delete cascade,
  payment_method public.payment_method not null,
  status public.sale_status not null default 'completed',
  total_amount numeric(12, 2) not null check (total_amount >= 0),
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default timezone('utc', now())
);

create index sales_session_created_at_idx on public.sales (session_id, created_at desc);
create index sales_business_created_at_idx on public.sales (business_id, created_at desc);

create table public.sale_items (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null default public.current_business_id() references public.businesses(id) on delete cascade,
  sale_id uuid not null references public.sales(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name_snapshot text not null,
  quantity integer not null check (quantity > 0),
  base_price numeric(12, 2) not null check (base_price >= 0),
  unit_price numeric(12, 2) not null check (unit_price >= 0),
  note text
);

create index sale_items_sale_id_idx on public.sale_items (sale_id);

create table public.cash_expenses (
  id uuid primary key,
  business_id uuid not null default public.current_business_id() references public.businesses(id) on delete cascade,
  session_id uuid not null references public.cash_sessions(id) on delete cascade,
  amount numeric(12, 2) not null check (amount > 0),
  reason text not null,
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default timezone('utc', now())
);

create index cash_expenses_session_created_at_idx on public.cash_expenses (session_id, created_at desc);

create table public.sale_voids (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null default public.current_business_id() references public.businesses(id) on delete cascade,
  sale_id uuid not null unique references public.sales(id) on delete cascade,
  resolution_mode public.void_resolution_mode not null,
  target_session_id uuid references public.cash_sessions(id) on delete set null,
  voided_by uuid not null default auth.uid() references auth.users(id),
  voided_at timestamptz not null default timezone('utc', now()),
  constraint sale_voids_current_session_requires_target
    check (
      (resolution_mode = 'current_session' and target_session_id is not null)
      or (resolution_mode = 'original_session')
    )
);

create index sale_voids_target_session_idx on public.sale_voids (target_session_id);

create or replace function public.open_cash_session(
  p_opening_amount numeric,
  p_opened_at timestamptz default timezone('utc', now())
)
returns public.cash_sessions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business_id uuid := public.current_business_id();
  v_session public.cash_sessions;
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión para abrir caja.';
  end if;

  if v_business_id is null then
    raise exception 'No se encontró un negocio asociado al usuario.';
  end if;

  insert into public.cash_sessions (
    business_id,
    opened_by,
    opening_amount,
    status,
    opened_at
  )
  values (
    v_business_id,
    auth.uid(),
    p_opening_amount,
    'open',
    coalesce(p_opened_at, timezone('utc', now()))
  )
  returning * into v_session;

  return v_session;
exception
  when unique_violation then
    raise exception 'Ya existe una caja abierta para este negocio.';
end;
$$;

create or replace function public.close_cash_session(
  p_session_id uuid,
  p_counted_cash numeric,
  p_closed_at timestamptz default timezone('utc', now())
)
returns public.cash_sessions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business_id uuid := public.current_business_id();
  v_session public.cash_sessions;
begin
  update public.cash_sessions
  set
    status = 'closed',
    counted_cash = p_counted_cash,
    closed_at = coalesce(p_closed_at, timezone('utc', now()))
  where
    id = p_session_id
    and business_id = v_business_id
    and status = 'open'
  returning * into v_session;

  if not found then
    raise exception 'No se encontró una caja abierta con ese identificador.';
  end if;

  return v_session;
end;
$$;

create or replace function public.create_sale(
  p_sale_id uuid,
  p_session_id uuid,
  p_payment_method public.payment_method,
  p_items jsonb,
  p_created_at timestamptz default timezone('utc', now())
)
returns public.sales
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business_id uuid := public.current_business_id();
  v_session public.cash_sessions;
  v_sale public.sales;
  v_total numeric(12, 2) := 0;
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión para registrar ventas.';
  end if;

  select *
  into v_sale
  from public.sales
  where id = p_sale_id and business_id = v_business_id;

  if found then
    return v_sale;
  end if;

  select *
  into v_session
  from public.cash_sessions
  where id = p_session_id and business_id = v_business_id;

  if not found then
    raise exception 'La sesión indicada no existe.';
  end if;

  if v_session.status <> 'open' then
    raise exception 'La caja debe estar abierta para registrar ventas.';
  end if;

  select coalesce(sum((item ->> 'unit_price')::numeric * (item ->> 'quantity')::integer), 0)
  into v_total
  from jsonb_array_elements(p_items) as item;

  if v_total <= 0 then
    raise exception 'La venta debe tener al menos un producto con total válido.';
  end if;

  insert into public.sales (
    id,
    business_id,
    session_id,
    payment_method,
    status,
    total_amount,
    created_by,
    created_at
  )
  values (
    p_sale_id,
    v_business_id,
    p_session_id,
    p_payment_method,
    'completed',
    v_total,
    auth.uid(),
    coalesce(p_created_at, timezone('utc', now()))
  )
  returning * into v_sale;

  insert into public.sale_items (
    business_id,
    sale_id,
    product_id,
    product_name_snapshot,
    quantity,
    base_price,
    unit_price,
    note
  )
  select
    v_business_id,
    v_sale.id,
    nullif(item ->> 'product_id', '')::uuid,
    coalesce(nullif(item ->> 'product_name', ''), 'Producto'),
    greatest((item ->> 'quantity')::integer, 1),
    greatest((item ->> 'base_price')::numeric, 0),
    greatest((item ->> 'unit_price')::numeric, 0),
    nullif(item ->> 'note', '')
  from jsonb_array_elements(p_items) as item;

  return v_sale;
end;
$$;

create or replace function public.create_cash_expense(
  p_expense_id uuid,
  p_session_id uuid,
  p_amount numeric,
  p_reason text,
  p_created_at timestamptz default timezone('utc', now())
)
returns public.cash_expenses
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business_id uuid := public.current_business_id();
  v_session public.cash_sessions;
  v_expense public.cash_expenses;
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión para registrar egresos.';
  end if;

  select *
  into v_expense
  from public.cash_expenses
  where id = p_expense_id and business_id = v_business_id;

  if found then
    return v_expense;
  end if;

  select *
  into v_session
  from public.cash_sessions
  where id = p_session_id and business_id = v_business_id;

  if not found then
    raise exception 'La sesión indicada no existe.';
  end if;

  if v_session.status <> 'open' then
    raise exception 'La caja debe estar abierta para registrar egresos.';
  end if;

  insert into public.cash_expenses (
    id,
    business_id,
    session_id,
    amount,
    reason,
    created_by,
    created_at
  )
  values (
    p_expense_id,
    v_business_id,
    p_session_id,
    p_amount,
    p_reason,
    auth.uid(),
    coalesce(p_created_at, timezone('utc', now()))
  )
  returning * into v_expense;

  return v_expense;
end;
$$;

create or replace function public.void_sale(
  p_sale_id uuid,
  p_resolution_mode public.void_resolution_mode,
  p_target_session_id uuid default null,
  p_voided_at timestamptz default timezone('utc', now())
)
returns public.sale_voids
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business_id uuid := public.current_business_id();
  v_sale public.sales;
  v_void public.sale_voids;
  v_target public.cash_sessions;
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión para anular ventas.';
  end if;

  select *
  into v_void
  from public.sale_voids
  where sale_id = p_sale_id and business_id = v_business_id;

  if found then
    return v_void;
  end if;

  select *
  into v_sale
  from public.sales
  where id = p_sale_id and business_id = v_business_id;

  if not found then
    raise exception 'La venta indicada no existe.';
  end if;

  if p_resolution_mode = 'current_session' then
    if p_target_session_id is null then
      raise exception 'Debes elegir una sesión actual para impactar hoy.';
    end if;

    select *
    into v_target
    from public.cash_sessions
    where id = p_target_session_id and business_id = v_business_id;

    if not found then
      raise exception 'La sesión destino no existe.';
    end if;

    if v_target.status <> 'open' then
      raise exception 'La sesión destino debe estar abierta para impactar hoy.';
    end if;
  end if;

  update public.sales
  set status = 'voided'
  where id = p_sale_id;

  insert into public.sale_voids (
    business_id,
    sale_id,
    resolution_mode,
    target_session_id,
    voided_by,
    voided_at
  )
  values (
    v_business_id,
    p_sale_id,
    p_resolution_mode,
    case
      when p_resolution_mode = 'current_session' then p_target_session_id
      else null
    end,
    auth.uid(),
    coalesce(p_voided_at, timezone('utc', now()))
  )
  returning * into v_void;

  return v_void;
end;
$$;

create or replace view public.cash_session_summaries
with (security_invoker = true)
as
with effective_sales as (
  select
    s.session_id,
    sum(
      case
        when sv.resolution_mode = 'original_session' then 0
        else s.total_amount
      end
    ) as effective_sales_total,
    sum(
      case
        when s.payment_method = 'cash' and sv.resolution_mode = 'original_session' then 0
        when s.payment_method = 'cash' then s.total_amount
        else 0
      end
    ) as effective_cash_sales,
    sum(
      case
        when s.payment_method = 'yape' and sv.resolution_mode = 'original_session' then 0
        when s.payment_method = 'yape' then s.total_amount
        else 0
      end
    ) as effective_yape_sales
  from public.sales s
  left join public.sale_voids sv on sv.sale_id = s.id
  group by s.session_id
),
current_voids as (
  select
    sv.target_session_id as session_id,
    sum(s.total_amount) as current_session_void_total,
    sum(case when s.payment_method = 'cash' then s.total_amount else 0 end) as current_session_void_cash,
    sum(case when s.payment_method = 'yape' then s.total_amount else 0 end) as current_session_void_yape
  from public.sale_voids sv
  join public.sales s on s.id = sv.sale_id
  where
    sv.resolution_mode = 'current_session'
    and sv.target_session_id is not null
  group by sv.target_session_id
),
expenses as (
  select
    session_id,
    sum(amount) as expenses_total
  from public.cash_expenses
  group by session_id
)
select
  cs.id,
  cs.status,
  cs.opened_at,
  cs.closed_at,
  cs.opening_amount,
  cs.counted_cash,
  coalesce(es.effective_sales_total, 0)::numeric(12, 2) as effective_sales_total,
  coalesce(es.effective_cash_sales, 0)::numeric(12, 2) as effective_cash_sales,
  coalesce(es.effective_yape_sales, 0)::numeric(12, 2) as effective_yape_sales,
  coalesce(cv.current_session_void_total, 0)::numeric(12, 2) as current_session_void_total,
  coalesce(cv.current_session_void_cash, 0)::numeric(12, 2) as current_session_void_cash,
  coalesce(cv.current_session_void_yape, 0)::numeric(12, 2) as current_session_void_yape,
  coalesce(ex.expenses_total, 0)::numeric(12, 2) as expenses_total,
  (
    cs.opening_amount
    + coalesce(es.effective_cash_sales, 0)
    - coalesce(cv.current_session_void_cash, 0)
    - coalesce(ex.expenses_total, 0)
  )::numeric(12, 2) as expected_cash
from public.cash_sessions cs
left join effective_sales es on es.session_id = cs.id
left join current_voids cv on cv.session_id = cs.id
left join expenses ex on ex.session_id = cs.id;

alter table public.businesses enable row level security;
alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.cash_sessions enable row level security;
alter table public.sales enable row level security;
alter table public.sale_items enable row level security;
alter table public.cash_expenses enable row level security;
alter table public.sale_voids enable row level security;

create policy businesses_owner_access
on public.businesses
for select
to authenticated
using (owner_user_id = auth.uid());

create policy businesses_owner_update
on public.businesses
for update
to authenticated
using (owner_user_id = auth.uid())
with check (owner_user_id = auth.uid());

create policy profiles_self_select
on public.profiles
for select
to authenticated
using (id = auth.uid());

create policy profiles_self_update
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy products_business_select
on public.products
for select
to authenticated
using (business_id = public.current_business_id());

create policy products_business_insert
on public.products
for insert
to authenticated
with check (business_id = public.current_business_id());

create policy products_business_update
on public.products
for update
to authenticated
using (business_id = public.current_business_id())
with check (business_id = public.current_business_id());

create policy cash_sessions_business_select
on public.cash_sessions
for select
to authenticated
using (business_id = public.current_business_id());

create policy cash_sessions_business_insert
on public.cash_sessions
for insert
to authenticated
with check (business_id = public.current_business_id());

create policy cash_sessions_business_update
on public.cash_sessions
for update
to authenticated
using (business_id = public.current_business_id())
with check (business_id = public.current_business_id());

create policy sales_business_select
on public.sales
for select
to authenticated
using (business_id = public.current_business_id());

create policy sales_business_insert
on public.sales
for insert
to authenticated
with check (business_id = public.current_business_id());

create policy sales_business_update
on public.sales
for update
to authenticated
using (business_id = public.current_business_id())
with check (business_id = public.current_business_id());

create policy sale_items_business_select
on public.sale_items
for select
to authenticated
using (business_id = public.current_business_id());

create policy sale_items_business_insert
on public.sale_items
for insert
to authenticated
with check (business_id = public.current_business_id());

create policy cash_expenses_business_select
on public.cash_expenses
for select
to authenticated
using (business_id = public.current_business_id());

create policy cash_expenses_business_insert
on public.cash_expenses
for insert
to authenticated
with check (business_id = public.current_business_id());

create policy cash_expenses_business_update
on public.cash_expenses
for update
to authenticated
using (business_id = public.current_business_id())
with check (business_id = public.current_business_id());

create policy sale_voids_business_select
on public.sale_voids
for select
to authenticated
using (business_id = public.current_business_id());

create policy sale_voids_business_insert
on public.sale_voids
for insert
to authenticated
with check (business_id = public.current_business_id());

grant usage on schema public to authenticated;
grant select, insert, update on public.businesses to authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert, update on public.products to authenticated;
grant select, insert, update on public.cash_sessions to authenticated;
grant select, insert, update on public.sales to authenticated;
grant select, insert on public.sale_items to authenticated;
grant select, insert, update on public.cash_expenses to authenticated;
grant select, insert on public.sale_voids to authenticated;
grant select on public.cash_session_summaries to authenticated;

grant execute on function public.current_business_id() to authenticated;
grant execute on function public.open_cash_session(numeric, timestamptz) to authenticated;
grant execute on function public.close_cash_session(uuid, numeric, timestamptz) to authenticated;
grant execute on function public.create_sale(uuid, uuid, public.payment_method, jsonb, timestamptz) to authenticated;
grant execute on function public.create_cash_expense(uuid, uuid, numeric, text, timestamptz) to authenticated;
grant execute on function public.void_sale(uuid, public.void_resolution_mode, uuid, timestamptz) to authenticated;
