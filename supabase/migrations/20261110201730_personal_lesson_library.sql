-- Personal library references to lessons in the shared lesson catalog.
-- Public lesson rows remain owned by their original creator; users only save a reference.
create table if not exists public.personal_lesson_library (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  lesson_id uuid not null references public.lesson_catalog(id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

create index if not exists personal_lesson_library_lesson_id_idx
  on public.personal_lesson_library (lesson_id);

alter table public.personal_lesson_library enable row level security;

-- New public-schema tables are not automatically exposed through the Data API.
grant select, insert, delete on public.personal_lesson_library to authenticated;

create policy "Users read their own personal lesson library"
  on public.personal_lesson_library for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users add published lessons to their own library"
  on public.personal_lesson_library for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.lesson_catalog lesson
      where lesson.id = lesson_id
        and lesson.is_public = true
        and lesson.publish_status = 'approved'
    )
  );

create policy "Users remove lessons from their own library"
  on public.personal_lesson_library for delete to authenticated
  using ((select auth.uid()) = user_id);
