create table if not exists public.image_model_configs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  provider text not null check (provider in ('openai')),
  model text not null,
  base_url text,
  api_key_encrypted text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists image_model_configs_default_per_user_idx
  on public.image_model_configs (user_id)
  where is_default;

create table if not exists public.image_generation_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  extraction_job_id uuid not null references public.extraction_jobs(id) on delete cascade,
  image_model_config_id uuid references public.image_model_configs(id) on delete set null,
  image_size text not null check (image_size in ('1024x1024', '1536x1536', '2048x2048')),
  status text not null check (status in ('processing', 'success', 'failed')),
  error_message text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists image_generation_tasks_user_created_at_idx
  on public.image_generation_tasks (user_id, created_at desc);

create table if not exists public.image_generation_results (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null unique references public.image_generation_tasks(id) on delete cascade,
  storage_path text not null,
  image_url text not null,
  provider_image_url text,
  model text not null,
  seed text,
  created_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists set_image_model_configs_updated_at on public.image_model_configs;
create trigger set_image_model_configs_updated_at
before update on public.image_model_configs
for each row execute procedure public.handle_updated_at();

drop trigger if exists set_image_generation_tasks_updated_at on public.image_generation_tasks;
create trigger set_image_generation_tasks_updated_at
before update on public.image_generation_tasks
for each row execute procedure public.handle_updated_at();

alter table public.image_model_configs enable row level security;
alter table public.image_generation_tasks enable row level security;
alter table public.image_generation_results enable row level security;

drop policy if exists "Users can manage own image model configs" on public.image_model_configs;
create policy "Users can manage own image model configs"
on public.image_model_configs
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can manage own image generation tasks" on public.image_generation_tasks;
create policy "Users can manage own image generation tasks"
on public.image_generation_tasks
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can manage own image generation results" on public.image_generation_results;
create policy "Users can manage own image generation results"
on public.image_generation_results
for all
using (
  exists (
    select 1
    from public.image_generation_tasks tasks
    where tasks.id = task_id
      and tasks.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.image_generation_tasks tasks
    where tasks.id = task_id
      and tasks.user_id = auth.uid()
  )
);

insert into storage.buckets (id, name, public)
values ('generated-images', 'generated-images', true)
on conflict (id) do nothing;

drop policy if exists "Users can upload own generated images" on storage.objects;
create policy "Users can upload own generated images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'generated-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users can update own generated images" on storage.objects;
create policy "Users can update own generated images"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'generated-images'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'generated-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users can delete own generated images" on storage.objects;
create policy "Users can delete own generated images"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'generated-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Public can view generated images" on storage.objects;
create policy "Public can view generated images"
on storage.objects
for select
to public
using (bucket_id = 'generated-images');
