create table if not exists public.edit_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_image_id uuid not null references public.image_generation_results(id) on delete cascade,
  status text not null check (status in (
    'splitting',
    'trimming',
    'validating',
    'editing_front',
    'editing_back',
    'uploading',
    'partial_success',
    'completed',
    'failed'
  )),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists edit_tasks_user_created_at_idx
  on public.edit_tasks (user_id, created_at desc);

create index if not exists edit_tasks_source_image_idx
  on public.edit_tasks (source_image_id, created_at desc);

create table if not exists public.edit_jobs (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.edit_tasks(id) on delete cascade,
  side text not null check (side in ('front', 'back')),
  style text not null check (style in (
    'luxury_wood',
    'premium_giftbox',
    'dark_luxury_stage',
    'soft_studio_light',
    'elegant_pedestal',
    'premium_velvet'
  )),
  status text not null check (status in ('processing', 'success', 'failed')),
  error_code text check (error_code in (
    'SPLIT_FAILED',
    'TRIM_EMPTY',
    'BOUNDING_BOX_TOO_SMALL',
    'OBJECT_TOO_CLOSE_TO_EDGE',
    'SOURCE_NOT_FOUND',
    'PHOTOROOM_REQUEST_FAILED',
    'PHOTOROOM_TIMEOUT',
    'PHOTOROOM_INVALID_RESPONSE',
    'UPLOAD_FAILED',
    'DB_WRITE_FAILED'
  )),
  error_message text,
  source_storage_path text,
  provider_raw_storage_path text,
  image_url text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists edit_jobs_task_side_created_at_idx
  on public.edit_jobs (task_id, side, created_at desc);

drop trigger if exists set_edit_tasks_updated_at on public.edit_tasks;
create trigger set_edit_tasks_updated_at
before update on public.edit_tasks
for each row execute procedure public.handle_updated_at();

drop trigger if exists set_edit_jobs_updated_at on public.edit_jobs;
create trigger set_edit_jobs_updated_at
before update on public.edit_jobs
for each row execute procedure public.handle_updated_at();

alter table public.edit_tasks enable row level security;
alter table public.edit_jobs enable row level security;

drop policy if exists "Users can manage own edit tasks" on public.edit_tasks;
create policy "Users can manage own edit tasks"
on public.edit_tasks
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can manage own edit jobs" on public.edit_jobs;
create policy "Users can manage own edit jobs"
on public.edit_jobs
for all
using (
  exists (
    select 1
    from public.edit_tasks tasks
    where tasks.id = task_id
      and tasks.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.edit_tasks tasks
    where tasks.id = task_id
      and tasks.user_id = auth.uid()
  )
);
