-- ============================================================
-- TOKO APP — Supabase Schema
-- Run this in Supabase SQL Editor
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- PROFILES (extends Supabase auth.users)
-- ============================================================
create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  name        text not null,
  role        text not null check (role in ('superadmin', 'kasir')),
  created_at  timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Superadmin can read all profiles"
  on public.profiles for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'superadmin'
    )
  );

create policy "Superadmin can insert profiles"
  on public.profiles for insert
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'superadmin'
    )
  );

-- ============================================================
-- RESELLERS
-- ============================================================
create table public.resellers (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  phone       text,
  address     text,
  city        text,
  notes       text,
  is_active   boolean default true,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

alter table public.resellers enable row level security;

create policy "Authenticated users can read resellers"
  on public.resellers for select
  using (auth.role() = 'authenticated');

create policy "Authenticated users can insert resellers"
  on public.resellers for insert
  with check (auth.role() = 'authenticated');

create policy "Authenticated users can update resellers"
  on public.resellers for update
  using (auth.role() = 'authenticated');

-- ============================================================
-- PRODUCTS
-- ============================================================
create table public.products (
  id            uuid primary key default uuid_generate_v4(),
  name          text not null,
  category      text,
  unit          text default 'pcs',
  harga_modal   numeric(15,2) not null default 0,  -- harga beli dari supplier (hanya superadmin)
  harga_katalog numeric(15,2) not null default 0,  -- harga jual ke reseller
  stock         integer not null default 0,
  color         text,
  description   text,
  is_active     boolean default true,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

alter table public.products enable row level security;

create policy "Authenticated users can read products"
  on public.products for select
  using (auth.role() = 'authenticated');

create policy "Authenticated users can insert products"
  on public.products for insert
  with check (auth.role() = 'authenticated');

create policy "Authenticated users can update products"
  on public.products for update
  using (auth.role() = 'authenticated');

-- ============================================================
-- TRANSACTIONS
-- ============================================================
create table public.transactions (
  id              uuid primary key default uuid_generate_v4(),
  reseller_id     uuid references public.resellers(id),
  reseller_name   text,                             -- snapshot nama saat transaksi
  status          text default 'TRANSFER' check (status in ('TRANSFER', 'COD')),
  payment_status  text default 'LUNAS' check (payment_status in ('LUNAS', 'DP', 'BELUM LUNAS')),
  uang_dp         numeric(15,2) default 0,
  ongkir          numeric(15,2) default 0,
  destination     text,
  driver          text,
  notes           text,
  created_by      uuid references auth.users(id),
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

alter table public.transactions enable row level security;

create policy "Authenticated users can read transactions"
  on public.transactions for select
  using (auth.role() = 'authenticated');

create policy "Authenticated users can insert transactions"
  on public.transactions for insert
  with check (auth.role() = 'authenticated');

create policy "Authenticated users can update transactions"
  on public.transactions for update
  using (auth.role() = 'authenticated');

-- ============================================================
-- TRANSACTION ITEMS
-- ============================================================
create table public.transaction_items (
  id                  uuid primary key default uuid_generate_v4(),
  transaction_id      uuid references public.transactions(id) on delete cascade,
  product_id          uuid references public.products(id),
  product_name        text not null,               -- snapshot nama produk
  product_color       text,
  quantity            integer not null default 1,
  harga_modal         numeric(15,2) not null,       -- snapshot harga modal saat transaksi
  harga_katalog       numeric(15,2) not null,       -- snapshot harga katalog saat transaksi
  harga_jual_reseller numeric(15,2) not null,       -- harga reseller jual ke customer
  bonus_reseller      numeric(15,2) not null default 0, -- bisa manual atau otomatis
  bonus_override      boolean default false,        -- true jika diinput manual
  laba_toko           numeric(15,2) generated always as (harga_katalog - harga_modal) stored,
  created_at          timestamptz default now()
);

alter table public.transaction_items enable row level security;

create policy "Authenticated users can read transaction items"
  on public.transaction_items for select
  using (auth.role() = 'authenticated');

create policy "Authenticated users can insert transaction items"
  on public.transaction_items for insert
  with check (auth.role() = 'authenticated');

-- ============================================================
-- STOCK MOVEMENTS (untuk audit trail stock)
-- ============================================================
create table public.stock_movements (
  id            uuid primary key default uuid_generate_v4(),
  product_id    uuid references public.products(id),
  product_name  text not null,
  type          text not null check (type in ('IN', 'OUT', 'ADJUSTMENT')),
  quantity      integer not null,
  reference_id  uuid,                              -- transaction_id jika OUT dari penjualan
  notes         text,
  created_by    uuid references auth.users(id),
  created_at    timestamptz default now()
);

alter table public.stock_movements enable row level security;

create policy "Authenticated users can read stock movements"
  on public.stock_movements for select
  using (auth.role() = 'authenticated');

create policy "Authenticated users can insert stock movements"
  on public.stock_movements for insert
  with check (auth.role() = 'authenticated');

-- ============================================================
-- FUNCTION: Auto-update stock ketika ada stock movement
-- ============================================================
create or replace function update_product_stock()
returns trigger as $$
begin
  if NEW.type = 'IN' then
    update public.products
    set stock = stock + NEW.quantity,
        updated_at = now()
    where id = NEW.product_id;
  elsif NEW.type in ('OUT', 'ADJUSTMENT') then
    update public.products
    set stock = stock - NEW.quantity,
        updated_at = now()
    where id = NEW.product_id;
  end if;
  return NEW;
end;
$$ language plpgsql security definer;

create trigger on_stock_movement
  after insert on public.stock_movements
  for each row execute function update_product_stock();

-- ============================================================
-- FUNCTION: Handle new user → auto-create profile
-- ============================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, role)
  values (
    NEW.id,
    coalesce(NEW.raw_user_meta_data->>'name', NEW.email),
    coalesce(NEW.raw_user_meta_data->>'role', 'kasir')
  );
  return NEW;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- VIEW: Laporan penjualan (tanpa harga modal — untuk kasir)
-- ============================================================
create or replace view public.v_sales_report as
select
  t.id as transaction_id,
  t.created_at,
  t.reseller_name,
  t.status,
  t.payment_status,
  t.ongkir,
  t.destination,
  ti.product_name,
  ti.product_color,
  ti.quantity,
  ti.harga_katalog,
  ti.harga_jual_reseller,
  ti.bonus_reseller,
  (ti.harga_katalog * ti.quantity) as total_katalog,
  (ti.harga_jual_reseller * ti.quantity) as total_jual_reseller,
  (ti.bonus_reseller * ti.quantity) as total_bonus
from public.transactions t
join public.transaction_items ti on ti.transaction_id = t.id;

-- ============================================================
-- VIEW: Laporan laba rugi (hanya superadmin — handle di app layer)
-- ============================================================
create or replace view public.v_profit_report as
select
  t.id as transaction_id,
  t.created_at,
  t.reseller_name,
  t.status,
  t.ongkir,
  t.destination,
  ti.product_name,
  ti.quantity,
  ti.harga_modal,
  ti.harga_katalog,
  ti.harga_jual_reseller,
  ti.bonus_reseller,
  ti.laba_toko,
  (ti.laba_toko * ti.quantity) as total_laba_toko,
  (ti.bonus_reseller * ti.quantity) as total_bonus_reseller
from public.transactions t
join public.transaction_items ti on ti.transaction_id = t.id;
