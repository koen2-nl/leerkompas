# LeerKompas — projectnotities

## Eerste versie
Deze repository bevat de eerste front-end demo van LeerKompas: een responsive React-app gebouwd met Vite. De interface gebruikt Nederlandstalige voorbeeldgegevens en werkt zonder account, API of database.

## Lokaal starten

```bash
npm install
npm run dev
npm run build
npm run preview
```

## Accounts en synchronisatie
- `src/auth/supabase.js`: Supabase-client op basis van Vite-omgevingsvariabelen.
- `src/auth/AuthGate.jsx`: registratie, e-mail/wachtwoord, Google OAuth, sessiebeheer en cloudsynchronisatie.
- `supabase/schema.sql`: persoonlijke JSON-data-opslag met Row Level Security; elke gebruiker kan uitsluitend de eigen rij lezen en wijzigen.
- Bij de eerste login worden bestaande lokale LeerKompas-gegevens naar het account gemigreerd als er nog geen cloudrecord bestaat.
- Na aanmelden wordt de persoonlijke clouddata geladen voordat de leeromgeving wordt getoond. Wijzigingen worden automatisch gesynchroniseerd.

### Supabase instellen
1. Maak een project op https://supabase.com/.
2. Open SQL Editor en voer `supabase/schema.sql` uit.
3. Kopieer Project URL en de publieke anon/publishable key naar `VITE_SUPABASE_URL` en `VITE_SUPABASE_ANON_KEY`.
4. Zet dezelfde variabelen als secrets/environment variables bij je hostingprovider. Gebruik nooit de `service_role`-sleutel in de frontend.
5. Schakel in Supabase Authentication de Google-provider in. Maak daarvoor een OAuth-client aan bij Google Cloud en vul de door Supabase getoonde callback-URL daar in.
6. Stel in Supabase Authentication → URL Configuration de lokale URL en je uiteindelijke productie-URL in bij Site URL en Redirect URLs.
7. Configureer e-mailbevestiging en test registratie, aanmelden, uitloggen en opnieuw aanmelden.

Google OAuth vereist dat de beheerder zelf de Google-clientgegevens in het Supabase-dashboard invoert. De code kan dit niet namens je doen.

### Beheer en adminaccounts\n- Voer na `supabase/schema.sql` ook `supabase/migrations/202611080001_admin_and_lessons.sql` uit in de Supabase SQL Editor.\n- Maak het eerste beheeraccount aan via Supabase Authentication → Users en voer daarna in de SQL Editor uit: `insert into public.user_roles (user_id, role) select id, 'admin' from auth.users where lower(email) = lower('jouw-e-mailadres') on conflict (user_id) do update set role = 'admin';` Vervang het e-mailadres door het account dat beheerder moet worden.\n- Daarna kan een beheerder extra bestaande accounts beheerrechten geven vanuit LeerKompas → Beheer. Maak nieuwe accounts eerst aan via Supabase Authentication.\n- Het beheerderspaneel kan XP, streak/sessies, lesvoortgang of alle leerdata per account resetten. Er is ook een centrale lesbibliotheek voor het opslaan en beheren van lesmetadata en JSON-lesinhoud.\n- Beheerfuncties gebruiken gecontroleerde SQL-functies en Row Level Security. Plaats nooit de Supabase `service_role`-sleutel in de browser.\n\nLet op: lessen die in de centrale lesbibliotheek worden aangemaakt, worden in deze eerste beheeruitbreiding opgeslagen en beheerd in Supabase. De koppeling waarmee die zelfgemaakte lessen automatisch in het leerling-lesoverzicht verschijnen, is een aparte vervolgstap.\n\n## Architectuur
- `src/main.jsx`: React-entrypoint en globale stylesheet.
- `src/App.jsx`: pagina-navigatie, demo-data en interacties.
- `src/styles.css`: componentstijlen, kleurthema's, donker thema en responsive breakpoints.
- `vite.config.js`: Vite-configuratie met relatief base-pad voor statische hosting.

## Wat werkt in deze demo
- Dashboard met statistiekkaarten en aan/uit te zetten widgets.
- Vakkenoverzicht, zoeken en een vak toevoegen.
- Eigen flashcards toevoegen, bekijken, oefenen en verwijderen.\n- Flashcards in bulk importeren vanuit CSV met kolommen voor vak, vraag en antwoord; onbekende vakken worden automatisch aangemaakt.
- Vakken, flashcards, thema-instellingen, dashboardwidgets en oefensessie-voortgang lokaal bewaren in de browser.
- Flashcards met antwoord omdraaien en sessie-feedback.
- Quiz Rush-vraag met antwoordcontrole.
- Game-overzicht met enkele demo-acties.
- Voortgangs- en planningspagina.
- Licht/donker thema en vier accentkleuren.
- Desktop-zijbalk en mobiele uitschuifnavigatie.

## Bewuste grenzen
LeerKompas bewaart vakken, flashcards, thema-instellingen, dashboardwidgets en oefensessie-voortgang lokaal in de browser via localStorage. Deze gegevens zijn alleen beschikbaar op hetzelfde apparaat en in dezelfde browser; er is nog geen account, cloudopslag of synchronisatie. Browsergegevens wissen kan de lokale leerdata verwijderen. Er zijn nog geen gedeelde sets, import/export, adaptief herhaalalgoritme of volledige minigames. Voeg geen geheime sleutels of privégegevens toe aan deze statische repository. Voor accounts, synchronisatie en veilige opslag is later een aparte backend nodig.

## Volgende technische stappen
1. Import/export voor leerstof ontwerpen.
2. Componenten en pagina's opdelen in kleinere modules.
3. Herhaalplanning met spaced repetition implementeren en testen.
4. Toetsen, statistieken en volledige games uitbreiden.
5. Toegankelijkheid, unit tests en end-to-end tests toevoegen.
6. GitHub Pages workflow toevoegen zodra de repository-instellingen en gewenste publicatie bekend zijn.
