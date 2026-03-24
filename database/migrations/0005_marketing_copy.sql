create table if not exists public.marketing_copy_templates (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text not null,
  prompt_guidance text not null,
  sort_order integer not null default 0,
  enabled boolean not null default true,
  created_at timestamptz not null default timezone('utc', now())
);

insert into public.marketing_copy_templates (slug, name, description, prompt_guidance, sort_order, enabled)
values
  (
    'solemn_commemorative',
    '庄重纪念型',
    '强调纪念意义、传承和尊重，适合纪念日、军事与国家荣誉主题。',
    'Use a solemn commemorative tone. Emphasize heritage, respect, remembrance, honor, and lasting significance. Keep the language premium, ceremonial, and emotionally grounded.',
    10,
    true
  ),
  (
    'emotional_gift',
    '情感礼品型',
    '强调赠礼场景、情感表达和纪念价值，适合礼品导向商品文案。',
    'Use an emotional gift-oriented tone. Emphasize gratitude, personal meaning, keepsake value, family gifting, and heartfelt emotional resonance. Keep the copy warm but still premium.',
    20,
    true
  ),
  (
    'historical_collectible',
    '历史收藏型',
    '强调收藏属性、工艺细节和历史象征意义，适合收藏类商品展示。',
    'Use a historical collectible tone. Emphasize craftsmanship, collectible appeal, symbolic design details, artistic relief, and display value for collectors.',
    30,
    true
  ),
  (
    'conversion_ad',
    '广告转化型',
    '强调卖点、礼赠理由和转化效率，适合广告落地页与投放文案。',
    'Use a conversion-focused advertising tone. Lead with strong benefits, buyer motivation, giftability, emotional payoff, and persuasive but credible product positioning.',
    40,
    true
  )
on conflict (slug) do update
set
  name = excluded.name,
  description = excluded.description,
  prompt_guidance = excluded.prompt_guidance,
  sort_order = excluded.sort_order,
  enabled = excluded.enabled;

create table if not exists public.marketing_copy_versions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  extraction_job_id uuid not null references public.extraction_jobs(id) on delete cascade,
  image_generation_task_id uuid not null references public.image_generation_tasks(id) on delete cascade,
  image_generation_result_id uuid not null references public.image_generation_results(id) on delete cascade,
  front_edit_job_id uuid not null references public.edit_jobs(id) on delete cascade,
  back_edit_job_id uuid not null references public.edit_jobs(id) on delete cascade,
  marketing_copy_template_id uuid not null references public.marketing_copy_templates(id),
  model_config_id uuid references public.model_configs(id) on delete set null,
  user_instruction text,
  draft_result_json jsonb not null,
  final_result_json jsonb,
  is_confirmed boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists marketing_copy_versions_user_created_at_idx
  on public.marketing_copy_versions (user_id, created_at desc);

create index if not exists marketing_copy_versions_source_combo_idx
  on public.marketing_copy_versions (
    user_id,
    image_generation_result_id,
    front_edit_job_id,
    back_edit_job_id,
    created_at desc
  );

create unique index if not exists marketing_copy_versions_confirmed_unique_idx
  on public.marketing_copy_versions (
    user_id,
    image_generation_result_id,
    front_edit_job_id,
    back_edit_job_id
  )
  where is_confirmed = true;

drop trigger if exists set_marketing_copy_versions_updated_at on public.marketing_copy_versions;
create trigger set_marketing_copy_versions_updated_at
before update on public.marketing_copy_versions
for each row execute procedure public.handle_updated_at();

alter table public.marketing_copy_templates enable row level security;
alter table public.marketing_copy_versions enable row level security;

drop policy if exists "Authenticated users can read marketing copy templates" on public.marketing_copy_templates;
create policy "Authenticated users can read marketing copy templates"
on public.marketing_copy_templates
for select
using (auth.uid() is not null);

drop policy if exists "Users can manage own marketing copy versions" on public.marketing_copy_versions;
create policy "Users can manage own marketing copy versions"
on public.marketing_copy_versions
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
