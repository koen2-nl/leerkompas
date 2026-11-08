drop function if exists public.admin_list_users();

create function public.admin_list_users()
returns table(user_id uuid, email text, created_at timestamptz, data jsonb, role text)
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_leerkompas_admin() then raise exception 'Geen beheerrechten'; end if;
  return query
    select u.id, u.email::text, u.created_at, coalesce(d.data, '{}'::jsonb), coalesce(r.role, 'user')
    from auth.users u
    left join public.user_data d on d.user_id = u.id
    left join public.user_roles r on r.user_id = u.id
    order by u.created_at desc;
end;
$$;

create or replace function public.admin_set_user_role(p_user_id uuid, p_role text)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_leerkompas_admin() then raise exception 'Geen beheerrechten'; end if;
  if p_user_id = (select auth.uid()) then raise exception 'Je kunt je eigen rol niet aanpassen'; end if;
  if p_role not in ('admin', 'user') then raise exception 'Ongeldige rol'; end if;
  if not exists (select 1 from auth.users where id = p_user_id) then
    raise exception 'Gebruiker niet gevonden';
  end if;

  if p_role = 'admin' then
    insert into public.user_roles(user_id, role) values (p_user_id, 'admin')
    on conflict (user_id) do update set role = 'admin';
  else
    delete from public.user_roles where user_id = p_user_id;
  end if;
end;
$$;

revoke execute on function public.admin_list_users() from public, anon;
revoke execute on function public.admin_set_user_role(uuid, text) from public, anon;
grant execute on function public.admin_list_users() to authenticated;
grant execute on function public.admin_set_user_role(uuid, text) to authenticated;
