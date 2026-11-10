create table if not exists public.changelog_entries (
  id uuid primary key default gen_random_uuid(),
  version text not null,
  release_date date not null default current_date,
  title text not null,
  summary text not null default '',
  changes text[] not null default '{}',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.changelog_entries enable row level security;
grant select, insert, update, delete on public.changelog_entries to authenticated;
drop policy if exists "Authenticated users can read changelog" on public.changelog_entries;
create policy "Authenticated users can read changelog"
on public.changelog_entries for select to authenticated using (true);
drop policy if exists "Admins manage changelog" on public.changelog_entries;
create policy "Admins manage changelog"
on public.changelog_entries for all to authenticated
using (public.is_leerkompas_admin())
with check (public.is_leerkompas_admin());
create index if not exists changelog_entries_release_date_idx
on public.changelog_entries(release_date desc, created_at desc);

insert into public.changelog_entries(version,release_date,title,summary,changes)
values
('v0.38 beta','2026-11-10','Persoonlijke instellingen en lessen delen','Instellingen, lesdelen en woordenlijstherkenning uitgebreid.',array['Tijdgebonden begroeting en vraag voor donkere modus na 22:00.','Uitgebreide profielinstellingen en changelog.','Beheerdersaanvraag na zes weken en tien afgeronde lessen.','Betere woordenlijstherkenning met betekenissen en hoofdstukopdrachten.','Privélessen delen via link en aanbieden voor openbare publicatie na beoordeling.']),
('v0.37 beta','2026-11-10','Leerstof en woordenlijsten','Nieuwe hulpmiddelen voor het maken en oefenen van lesmateriaal.',array['Nieuw Leerstof-menu met Mijn lessen, Minigames, Flashcards en Woordenlijst maken.','Lesmaker-rol toegevoegd voor het beheren van eigen lesmateriaal.','Upload DOCX en foto’s om begrippen te herkennen en woordenlijsten op te slaan.']),
('v0.36 beta','2026-11-09','Voortgang en versiebeheer','Voortgang en versie-informatie verbeterd.',array['Voortgang wordt opgeschoond als een les uit de catalogus verdwijnt.','Dashboard toont de geplande leertijd en het persoonlijke leerdoel.','Versienummer wordt automatisch gekoppeld aan pull requests.']),
('v0.31–0.35 beta','2026-11-09','Profiel en dashboard','Persoonlijke profiel- en dashboardfuncties toegevoegd.',array['Profielinstellingen en niveau-afhankelijke klaskeuzes.','Lescatalogus en voortgang worden met het account gesynchroniseerd.','Planning, live klok en vernieuwde SlimLeren-huisstijl.']),
('v0.17–0.30 beta','2026-01-01','Basis van SlimLeren','De basis van de leeromgeving uitgebreid.',array['Nieuwe leeromgeving met overzicht, lessen, planning en voortgang.','Interactieve lessen, flashcards en minigames.','Accountregistratie, onboarding en beheerderspaneel.']),
('v0.1 beta','2026-01-01','Eerste versie','Eerste versie van de leeromgeving.',array['Eerste versie van de leeromgeving en basisnavigatie.','Eerste onderdelen voor lessen en persoonlijke leerdoelen.'])
on conflict do nothing;
