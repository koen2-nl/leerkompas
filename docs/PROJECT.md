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

## Architectuur
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
