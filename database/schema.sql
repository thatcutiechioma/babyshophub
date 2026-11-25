-- BabyShopHub: base schema for a fresh Supabase project.
-- Run once in Supabase -> SQL Editor. Safe to re-run.

-- ---------------------------------------------------------------- roles
do $$ begin
  create type public.app_role as enum ('admin', 'customer');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------- tables
create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  phone text not null default '',
  preferred_payment_method text not null default 'demo_card',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  brand text not null default '',
  category text not null default 'clothing',
  description text not null default '',
  price numeric(10, 2) not null check (price >= 0),
  compare_at_price numeric(10, 2),
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  image_url text not null default '',
  badge text not null default '',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  recipient_name text not null default '',
  phone text not null default '',
  address_line_1 text not null default '',
  address_line_2 text not null default '',
  city text not null default '',
  region text not null default '',
  postal_code text not null default '',
  country text not null default '',
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  order_number text not null unique,
  status text not null default 'placed'
    check (status in ('placed', 'packed', 'shipped', 'delivered', 'cancelled')),
  payment_method text not null default 'demo_card',
  shipping_address jsonb not null default '{}'::jsonb,
  tracking_number text not null default '',
  total_amount numeric(10, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  product_name text not null,
  quantity integer not null check (quantity > 0),
  unit_price numeric(10, 2) not null,
  line_total numeric(10, 2) not null
);

create table if not exists public.product_reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  reviewer_name text not null default '',
  rating integer not null check (rating between 1 and 5),
  review_text text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, user_id)
);

create table if not exists public.support_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  subject text not null,
  message text not null,
  status text not null default 'open' check (status in ('open', 'in_progress', 'resolved')),
  admin_reply text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_addresses_user on public.addresses (user_id);
create index if not exists idx_orders_user on public.orders (user_id);
create index if not exists idx_order_items_order on public.order_items (order_id);
create index if not exists idx_reviews_product on public.product_reviews (product_id);
create index if not exists idx_support_user on public.support_requests (user_id);

-- ---------------------------------------------------------------- helpers
-- Admin check lives in a SECURITY DEFINER function so policies never read user_roles directly.
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role);
$$;

-- Every new account (email or Google) gets a profile and the customer role.
create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (user_id, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', '')
  )
  on conflict (user_id) do nothing;

  insert into public.user_roles (user_id, role)
  values (new.id, 'customer')
  on conflict (user_id, role) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row
  execute function public.handle_new_user_profile();

-- ---------------------------------------------------------------- checkout
-- One call records the order, its lines and the stock used. Stock rows are locked.
create or replace function public.place_order(
  p_address_id uuid,
  p_items jsonb,
  p_payment_method text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_address public.addresses;
  v_order_id uuid;
  v_total numeric(10, 2) := 0;
  v_item jsonb;
  v_product public.products;
  v_qty integer;
begin
  if v_user_id is null then
    raise exception 'Sign in before placing an order';
  end if;
  if p_payment_method not in ('demo_card', 'cash_on_delivery') then
    raise exception 'Choose a supported payment method';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) < 1 then
    raise exception 'Your basket is empty';
  end if;

  select * into v_address from public.addresses where id = p_address_id and user_id = v_user_id;
  if not found then
    raise exception 'Choose one of your saved delivery addresses';
  end if;

  insert into public.orders (user_id, order_number, payment_method, shipping_address)
  values (
    v_user_id,
    'BSH-' || to_char(now(), 'YYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6)),
    p_payment_method,
    jsonb_build_object(
      'recipient_name', v_address.recipient_name,
      'phone', v_address.phone,
      'address_line_1', v_address.address_line_1,
      'address_line_2', v_address.address_line_2,
      'city', v_address.city,
      'region', v_address.region,
      'postal_code', v_address.postal_code,
      'country', v_address.country
    )
  )
  returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := (v_item ->> 'quantity')::integer;
    if v_qty is null or v_qty < 1 or v_qty > 20 then
      raise exception 'Choose between 1 and 20 of each item';
    end if;

    select * into v_product
    from public.products
    where id = (v_item ->> 'product_id')::uuid and is_active
    for update;
    if not found then
      raise exception 'One of the items is no longer available';
    end if;
    if v_product.stock_quantity < v_qty then
      raise exception 'Not enough stock for %', v_product.name;
    end if;

    insert into public.order_items (order_id, product_id, product_name, quantity, unit_price, line_total)
    values (v_order_id, v_product.id, v_product.name, v_qty, v_product.price, v_product.price * v_qty);

    update public.products
    set stock_quantity = stock_quantity - v_qty, updated_at = now()
    where id = v_product.id;

    v_total := v_total + v_product.price * v_qty;
  end loop;

  update public.orders set total_amount = v_total where id = v_order_id;
  return v_order_id;
end;
$$;

revoke execute on function public.place_order(uuid, jsonb, text) from public, anon;
grant execute on function public.place_order(uuid, jsonb, text) to authenticated;

-- ---------------------------------------------------------------- admin access
-- Only an existing admin can change roles, and the last admin cannot remove themselves.
create or replace function public.set_user_admin(p_user_id uuid, p_is_admin boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.has_role(auth.uid(), 'admin') then
    raise exception 'Only shop admins can change admin access';
  end if;

  if p_is_admin then
    insert into public.user_roles (user_id, role) values (p_user_id, 'admin')
    on conflict (user_id, role) do nothing;
  else
    if p_user_id = auth.uid()
       and (select count(*) from public.user_roles where role = 'admin') <= 1 then
      raise exception 'You are the last shop admin';
    end if;
    delete from public.user_roles where user_id = p_user_id and role = 'admin';
  end if;
end;
$$;

revoke execute on function public.set_user_admin(uuid, boolean) from public, anon;
grant execute on function public.set_user_admin(uuid, boolean) to authenticated;

-- ---------------------------------------------------------------- row level security
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.products enable row level security;
alter table public.addresses enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.product_reviews enable row level security;
alter table public.support_requests enable row level security;

-- profiles
drop policy if exists "Own profile" on public.profiles;
create policy "Own profile" on public.profiles for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "Admins read profiles" on public.profiles;
create policy "Admins read profiles" on public.profiles for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));

-- user_roles: read-only for the app. Changes only go through set_user_admin().
drop policy if exists "Read own roles" on public.user_roles;
create policy "Read own roles" on public.user_roles for select to authenticated
  using (user_id = auth.uid());
drop policy if exists "Admins read roles" on public.user_roles;
create policy "Admins read roles" on public.user_roles for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));

-- products: everyone browses active ones, admins manage everything
drop policy if exists "Anon shoppers browse active products" on public.products;
create policy "Anon shoppers browse active products" on public.products for select to anon
  using (is_active);
drop policy if exists "Signed-in shoppers browse active products" on public.products;
create policy "Signed-in shoppers browse active products" on public.products for select to authenticated
  using (is_active or public.has_role(auth.uid(), 'admin'));
drop policy if exists "Admins insert products" on public.products;
create policy "Admins insert products" on public.products for insert to authenticated
  with check (public.has_role(auth.uid(), 'admin'));
drop policy if exists "Admins update products" on public.products;
create policy "Admins update products" on public.products for update to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
drop policy if exists "Admins delete products" on public.products;
create policy "Admins delete products" on public.products for delete to authenticated
  using (public.has_role(auth.uid(), 'admin'));

-- addresses: private to the owner
drop policy if exists "Own addresses" on public.addresses;
create policy "Own addresses" on public.addresses for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- orders: owners read their own, admins read and update all. Orders are created by place_order() only.
drop policy if exists "Read own orders" on public.orders;
create policy "Read own orders" on public.orders for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));
drop policy if exists "Admins update orders" on public.orders;
create policy "Admins update orders" on public.orders for update to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists "Read own order items" on public.order_items;
create policy "Read own order items" on public.order_items for select to authenticated
  using (exists (
    select 1 from public.orders o
    where o.id = order_items.order_id
      and (o.user_id = auth.uid() or public.has_role(auth.uid(), 'admin'))
  ));

-- reviews: public to read, owners write their own
drop policy if exists "Anyone reads reviews" on public.product_reviews;
create policy "Anyone reads reviews" on public.product_reviews for select to anon, authenticated
  using (true);
drop policy if exists "Write own review" on public.product_reviews;
create policy "Write own review" on public.product_reviews for insert to authenticated
  with check (user_id = auth.uid());
drop policy if exists "Update own review" on public.product_reviews;
create policy "Update own review" on public.product_reviews for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "Delete own review" on public.product_reviews;
create policy "Delete own review" on public.product_reviews for delete to authenticated
  using (user_id = auth.uid());

-- support requests: owners create and read their own, admins read and reply to all
drop policy if exists "Read own support requests" on public.support_requests;
create policy "Read own support requests" on public.support_requests for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));
drop policy if exists "Create own support request" on public.support_requests;
create policy "Create own support request" on public.support_requests for insert to authenticated
  with check (user_id = auth.uid());
drop policy if exists "Admins reply to support" on public.support_requests;
create policy "Admins reply to support" on public.support_requests for update to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

-- ---------------------------------------------------------------- table access
grant usage on schema public to anon, authenticated;
grant select on public.products, public.product_reviews to anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
revoke insert, update, delete on public.user_roles from authenticated;
revoke insert, update, delete on public.orders, public.order_items from authenticated;
grant update (status, tracking_number, updated_at) on public.orders to authenticated;