-- Lookup existing policies that might reference profiles in their qual/with_check
select policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename = 'profiles';

-- Drop legacy/admin policies that may cause recursion
drop policy if exists "Admin can read students" on public.profiles;

-- Create admin helper function
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- Ensure RLS is enabled
alter table public.profiles enable row level security;

-- Recreate policies
drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
  on public.profiles
  for select
  using (id = auth.uid());

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles
  for update
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists "Admin can read student profiles" on public.profiles;
create policy "Admin can read student profiles"
  on public.profiles
  for select
  using (public.is_admin() and role = 'student');

-- Verification
select policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename = 'profiles'
order by policyname;
