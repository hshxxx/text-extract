alter table public.image_generation_tasks
  drop constraint if exists image_generation_tasks_image_size_check;

alter table public.image_generation_tasks
  add constraint image_generation_tasks_image_size_check
  check (image_size in ('1024x1024', '1536x1536', '2048x2048', '2560x1440', '3840x2160'));
