create table if not exists public.google_oauth_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  google_email text not null,
  access_token_encrypted text not null,
  refresh_token_encrypted text not null,
  expiry_date timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id)
);

create table if not exists public.quantity_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  is_default boolean not null default false,
  is_seeded boolean not null default false,
  tiers_json jsonb not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.export_batches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  sheet_id text not null,
  sheet_url text not null,
  batch_name text not null,
  product_count integer not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.export_products (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.export_batches(id) on delete cascade,
  export_product_id text not null,
  handle text not null,
  image_generation_result_id uuid not null references public.image_generation_results(id) on delete cascade,
  front_edit_job_id uuid not null references public.edit_jobs(id) on delete cascade,
  back_edit_job_id uuid not null references public.edit_jobs(id) on delete cascade,
  marketing_copy_version_id uuid not null references public.marketing_copy_versions(id) on delete cascade,
  quantity_template_id uuid not null references public.quantity_templates(id),
  variant_overrides_json jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists google_oauth_accounts_user_idx
  on public.google_oauth_accounts (user_id);

create index if not exists quantity_templates_user_idx
  on public.quantity_templates (user_id, updated_at desc);

create unique index if not exists quantity_templates_seeded_name_unique_idx
  on public.quantity_templates (name)
  where user_id is null;

create unique index if not exists quantity_templates_user_default_unique_idx
  on public.quantity_templates (user_id)
  where is_default = true and user_id is not null;

create index if not exists export_batches_user_created_at_idx
  on public.export_batches (user_id, created_at desc);

create index if not exists export_products_batch_idx
  on public.export_products (batch_id, created_at desc);

create index if not exists export_products_handle_idx
  on public.export_products (handle);

drop trigger if exists set_google_oauth_accounts_updated_at on public.google_oauth_accounts;
create trigger set_google_oauth_accounts_updated_at
before update on public.google_oauth_accounts
for each row execute procedure public.handle_updated_at();

drop trigger if exists set_quantity_templates_updated_at on public.quantity_templates;
create trigger set_quantity_templates_updated_at
before update on public.quantity_templates
for each row execute procedure public.handle_updated_at();

insert into public.quantity_templates (name, is_default, is_seeded, tiers_json)
values (
  'Coin Bundle Template',
  true,
  true,
  '[
    {"optionValue":"1PC","price":11.99,"compareAtPrice":23.99,"inventoryQty":100},
    {"optionValue":"3PCS","price":23.99,"compareAtPrice":47.99,"inventoryQty":100},
    {"optionValue":"5PCS","price":35.99,"compareAtPrice":69.99,"inventoryQty":100},
    {"optionValue":"8PCS","price":47.99,"compareAtPrice":89.99,"inventoryQty":100},
    {"optionValue":"10PCS","price":59.99,"compareAtPrice":119.99,"inventoryQty":100},
    {"optionValue":"20PCS","price":119.99,"compareAtPrice":199.99,"inventoryQty":100},
    {"optionValue":"30PCS","price":179.99,"compareAtPrice":299.99,"inventoryQty":100}
  ]'::jsonb
)
on conflict (name) where user_id is null do update
set
  is_default = excluded.is_default,
  is_seeded = excluded.is_seeded,
  tiers_json = excluded.tiers_json;

alter table public.google_oauth_accounts enable row level security;
alter table public.quantity_templates enable row level security;
alter table public.export_batches enable row level security;
alter table public.export_products enable row level security;

drop policy if exists "Users can manage own google oauth accounts" on public.google_oauth_accounts;
create policy "Users can manage own google oauth accounts"
on public.google_oauth_accounts
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Authenticated users can read seeded quantity templates" on public.quantity_templates;
create policy "Authenticated users can read seeded quantity templates"
on public.quantity_templates
for select
using (auth.uid() is not null and (user_id is null or auth.uid() = user_id));

drop policy if exists "Users can create own quantity templates" on public.quantity_templates;
create policy "Users can create own quantity templates"
on public.quantity_templates
for insert
with check (auth.uid() = user_id and user_id is not null);

drop policy if exists "Users can update own quantity templates" on public.quantity_templates;
create policy "Users can update own quantity templates"
on public.quantity_templates
for update
using (auth.uid() = user_id and user_id is not null)
with check (auth.uid() = user_id and user_id is not null);

drop policy if exists "Users can delete own quantity templates" on public.quantity_templates;
create policy "Users can delete own quantity templates"
on public.quantity_templates
for delete
using (auth.uid() = user_id and user_id is not null);

drop policy if exists "Users can manage own export batches" on public.export_batches;
create policy "Users can manage own export batches"
on public.export_batches
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can manage own export products" on public.export_products;
create policy "Users can manage own export products"
on public.export_products
for all
using (
  exists (
    select 1
    from public.export_batches batches
    where batches.id = export_products.batch_id
      and batches.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.export_batches batches
    where batches.id = export_products.batch_id
      and batches.user_id = auth.uid()
  )
);
