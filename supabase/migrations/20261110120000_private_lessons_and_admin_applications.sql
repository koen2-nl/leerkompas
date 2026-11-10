-- Private lessons, share-by-link tokens, public-library review, and admin applications.
alter table public.lesson_catalog
  add column if not exists is_public boolean not null default false,
  add column if not exists publish_status text not null default 'private',
  add column if not exists share_token uuid not null default gen_random_uuid();

alter table public.lesson_catalog drop constraint if exists lesson_catalog_publish_status_check;
alter table public.lesson_catalog add constraint lesson_catalog_publish_status_check
  check (publish_status in ('private','pending','approved','rejected'));

drop policy if exists "Authenticated users can read lessons" on public.lesson_catalog;
drop policy if exists "Admins can read lessons" on public.lesson_catalog;
drop policy if exists "Admins and lesson makers can create lessons" on public.lesson_catalog;
drop policy if exists "Admins and owners can update lessons" on public.lesson_catalog;
drop policy if exists "Admins can delete lessons" on public.lesson_catalog;
drop policy if exists "Users read published lessons and their own" on public.lesson_catalog;
drop policy if exists "All signed-in users create private lessons" on public.lesson_catalog;
drop policy if exists "Owners edit private lessons and reviewers moderate" on public.lesson_catalog;
drop policy if exists "Owners delete private lessons and admins delete all" on public.lesson_catalog;

create policy "Users read published lessons and their own"
on public.lesson_catalog for select to authenticated
using (
  (is_public = true and publish_status = 'approved')
  or created_by = (select auth.uid())
  or public.is_leerkompas_admin()
  or (public.can_manage_lessons() and publish_status = 'pending')
);

create policy "All signed-in users create private lessons"
on public.lesson_catalog for insert to authenticated
with check (created_by = (select auth.uid()) and is_public = false and publish_status = 'private');

create policy "Owners edit private lessons and reviewers moderate"
on public.lesson_catalog for update to authenticated
using (
  (created_by = (select auth.uid()) and is_public = false and publish_status in ('private','pending','rejected'))
  or public.is_leerkompas_admin()
  or (public.can_manage_lessons() and publish_status = 'pending')
)
with check (
  (created_by = (select auth.uid()) and is_public = false and publish_status in ('private','pending','rejected'))
  or public.is_leerkompas_admin()
  or (public.can_manage_lessons() and publish_status in ('pending','approved','rejected'))
);

create policy "Owners delete private lessons and admins delete all"
on public.lesson_catalog for delete to authenticated
using (
  (created_by = (select auth.uid()) and is_public = false)
  or public.is_leerkompas_admin()
);

create or replace function public.get_shared_lesson(p_share_token uuid)
returns setof public.lesson_catalog
language sql
stable
security definer
set search_path = ''
as $$
  select * from public.lesson_catalog
  where share_token = p_share_token
    and (is_public = false or publish_status = 'approved')
  limit 1;
$$;
revoke all on function public.get_shared_lesson(uuid) from public;
grant execute on function public.get_shared_lesson(uuid) to anon, authenticated;

create table if not exists public.admin_role_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  reason text not null check (char_length(trim(reason)) >= 30),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id)
);
create index if not exists admin_role_applications_user_idx on public.admin_role_applications(user_id, created_at desc);
create unique index if not exists admin_role_applications_one_pending_per_user on public.admin_role_applications(user_id) where status = 'pending';
alter table public.admin_role_applications enable row level security;

create or replace function public.can_apply_for_admin_role()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select u.created_at <= now() - interval '6 weeks' from auth.users u where u.id = (select auth.uid()))
    and coalesce((
      select jsonb_array_length(coalesce(d.data->'completedLessons','[]'::jsonb))
      from public.user_data d where d.user_id = (select auth.uid())
    ),0) >= 10
    and not exists (
      select 1 from public.user_roles r where r.user_id = (select auth.uid()) and r.role = 'admin'
    );
$$;
revoke all on function public.can_apply_for_admin_role() from public, anon;
grant execute on function public.can_apply_for_admin_role() to authenticated;

drop policy if exists "Users submit eligible admin applications" on public.admin_role_applications;
drop policy if exists "Users read own admin applications" on public.admin_role_applications;
drop policy if exists "Admins read and review admin applications" on public.admin_role_applications;

create policy "Users submit eligible admin applications"
on public.admin_role_applications for insert to authenticated
with check (
  user_id = (select auth.uid())
  and status = 'pending'
  and public.can_apply_for_admin_role()
);
create policy "Users read own admin applications"
on public.admin_role_applications for select to authenticated
using (user_id = (select auth.uid()));
create policy "Admins read and review admin applications"
on public.admin_role_applications for all to authenticated
using (public.is_leerkompas_admin())
with check (public.is_leerkompas_admin());
grant select, insert, update on public.admin_role_applications to authenticated;
