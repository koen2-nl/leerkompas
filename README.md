# LeerKompas

**Leren op jouw manier.** Een moderne, speelse en responsive leeromgeving voor vakken, flashcards, quizzen en studieplanning.

## Snel starten

```bash
npm install
npm run dev
```

Maak een productiebuild met `npm run build`.

## In deze eerste demo

- Dashboard met widgets en studie-overzicht
- Vakken beheren en doorzoeken
- Eigen flashcards toevoegen, bekijken, oefenen en verwijderen\n- Flashcards in bulk importeren vanuit CSV (vak, vraag, antwoord; komma, puntkomma of tab als scheidingsteken)
- Vakken, flashcards en instellingen lokaal bewaren in de browser
- Flashcards om begrippen te oefenen
- Quiz Rush-vraag met feedback
- Game-overzicht, voortgang en planning
- Donker thema en vier accentkleuren
- Responsive navigatie voor mobiel en desktop

## Belangrijk

Dit is een front-end demonstratie zonder accounts of cloudopslag. Vakken, flashcards en instellingen worden lokaal in de browser bewaard; er is nog geen synchronisatie tussen apparaten. Zie [docs/PROJECT.md](docs/PROJECT.md) voor de architectuur, beperkingen en vervolgstappen.

## Accounts en cloudopslag

De Supabase-authenticatie en cloudsynchronisatie zijn voorbereid. Maak een Supabase-project, voer `supabase/schema.sql` uit en configureer `VITE_SUPABASE_URL` en `VITE_SUPABASE_ANON_KEY` (de publieke anon/publishable key) als omgevingsvariabelen. Kopieer `.env.example` naar `.env.local` voor lokaal gebruik. Stel in Supabase de site-URL en redirect-URL's in voor e-mailbevestiging en Google OAuth. Gebruik nooit de `service_role`-sleutel in de browser of in GitHub.

Zie [docs/PROJECT.md](docs/PROJECT.md) voor de installatie en beveiligingsregels.

## Technologie

React, Vite, Lucide React en Supabase.
