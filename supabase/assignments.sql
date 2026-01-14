create table if not exists public.assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  task_id bigint not null references public.tasks(id) on delete cascade,
  assigned_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (user_id, task_id)
);

create index if not exists assignments_user_id_idx on public.assignments (user_id);
create index if not exists assignments_task_id_idx on public.assignments (task_id);

alter table public.assignments enable row level security;

create policy "Admin can manage assignments" on public.assignments
  for all
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

create policy "Students can view their assignments" on public.assignments
  for select
  using (user_id = auth.uid());
