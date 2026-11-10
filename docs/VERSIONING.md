# Versiebeheer

De zichtbare versie van SlimLeren wordt automatisch afgeleid van het nummer van de pull request.

- Tijdens de beta krijgt de versie de vorm `v0.<PR-nummer> beta` (bijvoorbeeld PR #35 wordt `v0.35 beta`).
- In Vercel-previewbuilds wordt het nummer van de betreffende pull request gebruikt.
- In een productiebuild wordt het nummer van de meest recent gemergede pull request opgehaald.
- Als GitHub tijdelijk niet bereikbaar is, valt de build terug op de versie in `package.json`.

## Volledige release

Zolang `release-status.json` de waarde `"released": false` bevat, blijft de versie op `0.<PR-nummer> beta`.

Wanneer SlimLeren volledig wordt uitgebracht, zet je in `release-status.json` `"released"` op `true`. Vanaf de eerstvolgende build wordt dezelfde PR-volgnummering gebruikt met majorversie 1 en zonder beta-label, bijvoorbeeld `v1.35`.

De versie wordt op beide plekken in de interface (linksonder en in de footer) vanuit dezelfde buildwaarde getoond.


## Changelog bijwerken

Werk bij iedere pull request `docs/CHANGELOG.md` en `src/changelog.js` bij met een korte samenvatting van nieuwe functies, verbeteringen en bugfixes. De changelog in de instellingen gebruikt `src/changelog.js`.
