-- LeerKompas: één privé cloudback-up per Supabase-gebruiker.
create table if not exists public.user_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_data enable row level security;

 drop policy if exists "Users can read their own learning data" on public.user_data;
create policy "Users can read their own learning data"
  on public.user_data for select to authenticated
  using ((select auth.uid()) = user_id);

 drop policy if exists "Users can insert their own learning data" on public.user_data;
create policy "Users can insert their own learning data"
  on public.user_data for insert to authenticated
  with check ((select auth.uid()) = user_id);

 drop policy if exists "Users can update their own learning data" on public.user_data;
create policy "Users can update their own learning data"
  on public.user_data for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create or replace function public.set_user_data_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_user_data_updated_at on public.user_data;
create trigger set_user_data_updated_at
before update on public.user_data
for each row execute procedure public.set_user_data_updated_at();
