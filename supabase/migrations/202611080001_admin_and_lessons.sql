-- LeerKompas: adminrollen, beheerfuncties en centrale lesbibliotheek.
create table if not exists public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin')),
  created_at timestamptz not null default now()
);
alter table public.user_roles enable row level security;
drop policy if exists "Users can read their own role" on public.user_roles;
create policy "Users can read their own role" on public.user_roles
  for select to authenticated using ((select auth.uid()) = user_id);

create or replace function public.is_leerkompas_admin()
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists(select 1 from public.user_roles where user_id = (select auth.uid()) and role = 'admin');
$$;

create table if not exists public.lesson_catalog (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subject text not null,
  topic text not null default '',
  level text not null default 'Onderbouw',
  difficulty text not null default 'Basis',
  description text not null default '',
  content jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.lesson_catalog enable row level security;
drop policy if exists "Admins can read lessons" on public.lesson_catalog;
create policy "Admins can read lessons" on public.lesson_catalog for select to authenticated using (public.is_leerkompas_admin());
drop policy if exists "Admins can create lessons" on public.lesson_catalog;
create policy "Admins can create lessons" on public.lesson_catalog for insert to authenticated with check (public.is_leerkompas_admin());
drop policy if exists "Admins can update lessons" on public.lesson_catalog;
create policy "Admins can update lessons" on public.lesson_catalog for update to authenticated using (public.is_leerkompas_admin()) with check (public.is_leerkompas_admin());
drop policy if exists "Admins can delete lessons" on public.lesson_catalog;
create policy "Admins can delete lessons" on public.lesson_catalog for delete to authenticated using (public.is_leerkompas_admin());

create or replace function public.admin_list_users()
returns table(user_id uuid, email text, created_at timestamptz, data jsonb)
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_leerkompas_admin() then raise exception 'Geen beheerrechten'; end if;
  return query
    select u.id, u.email::text, u.created_at, coalesce(d.data, '{}'::jsonb)
    from auth.users u left join public.user_data d on d.user_id = u.id
    order by u.created_at desc;
end;
$$;

create or replace function public.admin_reset_user_data(p_user_id uuid, p_sections text[])
returns void language plpgsql security definer set search_path = ''
as $$
declare current_data jsonb;
begin
  if not public.is_leerkompas_admin() then raise exception 'Geen beheerrechten'; end if;
  select coalesce(data, '{}'::jsonb) into current_data from public.user_data where user_id = p_user_id;
  if current_data is null then current_data := '{}'::jsonb; end if;
  if 'all' = any(coalesce(p_sections, array[]::text[])) then
    current_data := '{}'::jsonb;
  else
    if 'xp' = any(p_sections) then current_data := jsonb_set(current_data, '{studyStats,xp}', '0'::jsonb, true); end if;
    if 'streak' = any(p_sections) then current_data := jsonb_set(current_data, '{studyStats,sessions}', '[]'::jsonb, true); end if;
    if 'progress' = any(p_sections) then
      current_data := jsonb_set(current_data, '{completedLessons}', '[]'::jsonb, true);
      current_data := jsonb_set(current_data, '{lessonProgress}', '{}'::jsonb, true);
    end if;
    if 'flashcards' = any(p_sections) then
      current_data := jsonb_set(current_data, '{cards}', '[]'::jsonb, true);
      current_data := jsonb_set(current_data, '{known}', '[]'::jsonb, true);
      current_data := jsonb_set(current_data, '{studyStats,cardsLearned}', '0'::jsonb, true);
    end if;
  end if;
  insert into public.user_data(user_id, data) values (p_user_id, current_data)
  on conflict (user_id) do update set data = excluded.data, updated_at = now();
end;
$$;

create or replace function public.admin_grant_admin(p_email text)
returns void language plpgsql security definer set search_path = ''
as $$
declare target_id uuid;
begin
  if not public.is_leerkompas_admin() then raise exception 'Geen beheerrechten'; end if;
  select id into target_id from auth.users where lower(email) = lower(trim(p_email)) limit 1;
  if target_id is null then raise exception 'Geen account gevonden met dit e-mailadres'; end if;
  insert into public.user_roles(user_id, role) values (target_id, 'admin')
  on conflict (user_id) do update set role = 'admin';
end;
$$;

grant execute on function public.is_leerkompas_admin() to authenticated;
grant execute on function public.admin_list_users() to authenticated;
grant execute on function public.admin_reset_user_data(uuid, text[]) to authenticated;
grant execute on function public.admin_grant_admin(text) to authenticated;


-- SECURITY DEFINER-functies mogen niet via de publieke API door
-- anonieme bezoekers of alle databasegebruikers worden aangeroepen.
revoke execute on function public.is_leerkompas_admin() from public, anon;
revoke execute on function public.admin_list_users() from public, anon;
revoke execute on function public.admin_reset_user_data(uuid, text[]) from public, anon;
revoke execute on function public.admin_grant_admin(text) from public, anon;

-- Alleen ingelogde gebruikers kunnen de functies bereiken; de functies
-- controleren zelf of de aanroeper daadwerkelijk beheerder is.
grant execute on function public.is_leerkompas_admin() to authenticated;
grant execute on function public.admin_list_users() to authenticated;
grant execute on function public.admin_reset_user_data(uuid, text[]) to authenticated;
grant execute on function public.admin_grant_admin(text) to authenticated;
