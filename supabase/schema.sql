-- =====================================================================
-- The Hyper Store — Supabase backend schema
-- Run this entire file once in: Supabase Dashboard -> SQL Editor -> New query
-- Safe to re-run (uses "if not exists" / "or replace" / drop-if-exists guards).
-- =====================================================================

-- Ensure gen_random_uuid() is available (Supabase usually has this on by
-- default, but this makes the script self-contained).
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- 1. PROFILES  (one row per auth.users row — holds role + display info)
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  role text not null default 'customer' check (role in ('customer','admin')),
  created_at timestamptz not null default now()
);

-- Auto-create a profile row whenever a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', new.email))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Helper: is the current logged-in user an admin? (security definer avoids
-- recursive-RLS issues when used inside policies on other tables)
create or replace function public.is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

-- ---------------------------------------------------------------------
-- 2. PRODUCTS  (catalog + inventory)
-- ---------------------------------------------------------------------
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text default '',
  category text default '',
  image_url text default '',
  old_price numeric(10,2),
  price numeric(10,2) not null,
  badge text default '',
  stock int not null default 0 check (stock >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at
  before update on public.products
  for each row execute procedure public.set_updated_at();

-- ---------------------------------------------------------------------
-- 3. ORDERS + ORDER_ITEMS
-- ---------------------------------------------------------------------
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  status text not null default 'pending'
    check (status in ('pending','paid','shipped','delivered','cancelled')),
  subtotal numeric(10,2) not null default 0,
  shipping_name text,
  shipping_phone text,
  shipping_address text,
  shipping_city text,
  shipping_postal text,
  shipping_country text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at
  before update on public.orders
  for each row execute procedure public.set_updated_at();

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id),
  product_name text not null,
  unit_price numeric(10,2) not null,
  size text,
  color text,
  quantity int not null check (quantity > 0)
);

-- ---------------------------------------------------------------------
-- 4. REVIEWS
-- ---------------------------------------------------------------------
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  user_id uuid references auth.users(id),
  author_name text not null default 'Anonymous',
  rating int not null check (rating between 1 and 5),
  comment text default '',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 5. RPC: create_order — atomically checks stock, decrements it,
--    and writes the order + its items in one transaction.
--    SECURITY NOTE: product name/price are looked up server-side from the
--    products table (never trusted from the client) so a tampered request
--    cannot change what gets charged.
--    items: jsonb array like
--      [{"product_id":"...","quantity":2,"size":"M","color":"Black"}, ...]
-- ---------------------------------------------------------------------
create or replace function public.create_order(
  items jsonb,
  shipping_name text,
  shipping_phone text,
  shipping_address text,
  shipping_city text,
  shipping_postal text,
  shipping_country text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_order_id uuid;
  item jsonb;
  calc_subtotal numeric(10,2) := 0;
  real_price numeric(10,2);
  real_name text;
  available_stock int;
  qty int;
begin
  if auth.uid() is null then
    raise exception 'Must be logged in to place an order';
  end if;

  if jsonb_array_length(items) = 0 then
    raise exception 'Cart is empty';
  end if;

  -- validate stock & compute subtotal using server-side truth
  for item in select * from jsonb_array_elements(items) loop
    qty := (item->>'quantity')::int;
    select price, stock, name into real_price, available_stock, real_name
      from public.products where id = (item->>'product_id')::uuid for update;
    if real_price is null then
      raise exception 'Product not found';
    end if;
    if available_stock < qty then
      raise exception 'Not enough stock for %', real_name;
    end if;
    calc_subtotal := calc_subtotal + (real_price * qty);
  end loop;

  insert into public.orders (
    user_id, subtotal, shipping_name, shipping_phone,
    shipping_address, shipping_city, shipping_postal, shipping_country
  ) values (
    auth.uid(), calc_subtotal, shipping_name, shipping_phone,
    shipping_address, shipping_city, shipping_postal, shipping_country
  ) returning id into new_order_id;

  for item in select * from jsonb_array_elements(items) loop
    qty := (item->>'quantity')::int;
    select price, name into real_price, real_name
      from public.products where id = (item->>'product_id')::uuid;

    insert into public.order_items (
      order_id, product_id, product_name, unit_price, size, color, quantity
    ) values (
      new_order_id,
      (item->>'product_id')::uuid,
      real_name,
      real_price,
      item->>'size',
      item->>'color',
      qty
    );

    update public.products
      set stock = stock - qty
      where id = (item->>'product_id')::uuid;
  end loop;

  return new_order_id;
end;
$$;

grant execute on function public.create_order(jsonb, text, text, text, text, text, text) to authenticated;

-- ---------------------------------------------------------------------
-- 6. ROW LEVEL SECURITY
-- ---------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.reviews enable row level security;

-- profiles: a user can see/update their own row; admins can see/update all.
drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin" on public.profiles
  for select using (auth.uid() = id or public.is_admin());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id or public.is_admin());

-- products: anyone (even logged out) can read active products.
-- only admins can insert/update/delete.
drop policy if exists "products_select_all" on public.products;
create policy "products_select_all" on public.products
  for select using (true);

drop policy if exists "products_write_admin" on public.products;
create policy "products_write_admin" on public.products
  for insert with check (public.is_admin());

drop policy if exists "products_update_admin" on public.products;
create policy "products_update_admin" on public.products
  for update using (public.is_admin());

drop policy if exists "products_delete_admin" on public.products;
create policy "products_delete_admin" on public.products
  for delete using (public.is_admin());

-- orders: a user sees only their own orders; admins see everything.
drop policy if exists "orders_select_own_or_admin" on public.orders;
create policy "orders_select_own_or_admin" on public.orders
  for select using (auth.uid() = user_id or public.is_admin());

-- orders are only ever created through create_order() (security definer),
-- so no direct insert policy for normal users is needed.
drop policy if exists "orders_update_admin" on public.orders;
create policy "orders_update_admin" on public.orders
  for update using (public.is_admin());

-- order_items: visible if you own the parent order, or you're an admin.
drop policy if exists "order_items_select_own_or_admin" on public.order_items;
create policy "order_items_select_own_or_admin" on public.order_items
  for select using (
    public.is_admin() or
    exists (select 1 from public.orders o where o.id = order_items.order_id and o.user_id = auth.uid())
  );

-- reviews: anyone can read; logged-in users can write their own; owner or
-- admin can delete.
drop policy if exists "reviews_select_all" on public.reviews;
create policy "reviews_select_all" on public.reviews
  for select using (true);

drop policy if exists "reviews_insert_own" on public.reviews;
create policy "reviews_insert_own" on public.reviews
  for insert with check (auth.uid() = user_id);

drop policy if exists "reviews_delete_own_or_admin" on public.reviews;
create policy "reviews_delete_own_or_admin" on public.reviews
  for delete using (auth.uid() = user_id or public.is_admin());

-- ---------------------------------------------------------------------
-- 7. SEED DATA — migrates the 6 products that used to be hardcoded in
--    main.js, so the storefront isn't empty right after setup.
-- ---------------------------------------------------------------------
insert into public.products (slug, name, description, category, image_url, old_price, price, badge, stock)
values
  ('wide-leg-black', 'WIDE LEG CARGO PANTS',
   'Relaxed, wide-leg silhouette cut from heavyweight fabric with a durable finish. Features an adjustable drawstring waist, deep side pockets, and a tapered hem for everyday streetwear layering.',
   'bottoms', 'assets/p1.svg', 120, 84.00, 'SALE 30%', 25),
  ('double-knee-grey', 'DOUBLE KNEE SWEATPANTS',
   'Heavyweight fleece sweatpants with a reinforced double-knee panel, elastic cuffs, and a relaxed tapered fit.',
   'bottoms', 'assets/p2.svg', 110, 77.00, 'SALE 30%', 18),
  ('parachute-navy', 'PARACHUTE TRACK PANTS',
   'Lightweight parachute nylon track pants with side snap tape detailing and a drawstring waist.',
   'bottoms', 'assets/p3.svg', 130, 91.00, 'SALE 30%', 12),
  ('pleated-cream', 'PLEATED WOOL TROUSERS',
   'Tailored wool-blend trousers with a pleated front, straight leg, and a soft brushed finish.',
   'bottoms', 'assets/p4.svg', 140, 98.00, 'SALE 30%', 9),
  ('baggy-brown', 'BAGGY CORDUROY PANTS',
   'Baggy-fit corduroy pants in a rich wide-wale texture with deep pockets and a relaxed drop crotch.',
   'bottoms', 'assets/p5.svg', 125, 87.00, 'SALE 30%', 20),
  ('flared-white', 'FLARED DENIM JEANS',
   'Classic flared denim with a high rise, raw hem finish, and stretch comfort fit.',
   'bottoms', 'assets/p6.svg', 135, 94.00, 'SALE 30%', 15)
on conflict (slug) do nothing;

-- =====================================================================
-- DONE. Next steps (see SETUP.md):
--  1. Project Settings -> API: copy "Project URL" and "anon public" key
--     into js/config.js
--  2. Sign up for an account on your live site (account.html)
--  3. In Table Editor -> profiles, change your row's "role" to admin
--  4. Visit admin.html and log in with that same account
-- =====================================================================
