create extension if not exists pgcrypto;

create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.model_configs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  provider text not null check (provider in ('openai', 'anthropic', 'gemini')),
  model text not null,
  base_url text,
  api_key_encrypted text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists model_configs_default_per_user_idx
  on public.model_configs (user_id)
  where is_default;

create table if not exists public.templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  content text not null,
  is_default boolean not null default false,
  is_seeded boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists templates_default_per_user_idx
  on public.templates (user_id)
  where is_default;

create table if not exists public.extraction_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  model_config_id uuid references public.model_configs(id) on delete set null,
  template_id uuid references public.templates(id) on delete set null,
  status text not null check (status in ('processing', 'success', 'failed')),
  raw_input text not null,
  template_snapshot text not null,
  raw_model_output text,
  structured_data jsonb,
  final_prompt text,
  error_message text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists extraction_jobs_user_created_at_idx
  on public.extraction_jobs (user_id, created_at desc);

drop trigger if exists set_model_configs_updated_at on public.model_configs;
create trigger set_model_configs_updated_at
before update on public.model_configs
for each row execute procedure public.handle_updated_at();

drop trigger if exists set_templates_updated_at on public.templates;
create trigger set_templates_updated_at
before update on public.templates
for each row execute procedure public.handle_updated_at();

drop trigger if exists set_extraction_jobs_updated_at on public.extraction_jobs;
create trigger set_extraction_jobs_updated_at
before update on public.extraction_jobs
for each row execute procedure public.handle_updated_at();

alter table public.model_configs enable row level security;
alter table public.templates enable row level security;
alter table public.extraction_jobs enable row level security;

create policy "Users can manage own model configs"
on public.model_configs
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can manage own templates"
on public.templates
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can manage own extraction jobs"
on public.extraction_jobs
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
