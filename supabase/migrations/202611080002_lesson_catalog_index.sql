-- Index the lesson author foreign key for efficient deletes/updates.
create index if not exists lesson_catalog_created_by_idx
  on public.lesson_catalog (created_by);
