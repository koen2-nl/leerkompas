import { ArrowLeft, BookOpen, FileText, LockKeyhole, Monitor, ShieldCheck } from 'lucide-react'
import './privacy-page.css'

export default function PrivacyPage() {
  return <main className="privacy-page">
    <article className="privacy-page-card">
      <a className="privacy-back-link" href="/"><ArrowLeft size={16}/> Terug naar Leervo</a>
      <div className="privacy-brand"><span className="privacy-brand-mark"><BookOpen size={22}/></span><span>Leervo</span></div>
      <span className="panel-kicker">PRIVACY EN GEGEVENS</span>
      <h1>Wat gebeurt er met je gegevens?</h1>
      <p className="privacy-intro">Leervo gebruikt een aantal gegevens om je leeromgeving te laten werken en je voortgang te bewaren. Hieronder leggen we uit wat de huidige app doet.</p>

      <section className="privacy-section">
        <div className="privacy-section-icon"><ShieldCheck size={18}/></div>
        <div><h2>Gegevens bij je account</h2>
          <p>Als je een account maakt, wordt je e-mailadres door Supabase Authentication beheerd. Je profiel kan je gebruikersnaam, school, klas, niveau, leerdoel en dagelijkse leertijd bevatten.</p>
          <p>Je vakken, flashcards, woordenlijsten, planning, lesvoortgang en studiegegevens worden in een persoonlijke gegevensback-up in Supabase gesynchroniseerd. De tabel <code>user_data</code> heeft Row Level Security: een aangemelde gebruiker mag alleen de eigen gegevensrij lezen of wijzigen.</p>
        </div>
      </section>
      <section className="privacy-section">
        <div className="privacy-section-icon"><Monitor size={18}/></div>
        <div><h2>Gegevens in je browser</h2>
          <p>Leervo bewaart ook voorkeuren en sommige spelvoortgang op het apparaat dat je gebruikt, bijvoorbeeld je thema-instelling en de pogingen van het Woord van de dag.</p>
          <p>Deze lokale gegevens zijn niet automatisch beschikbaar op een ander apparaat. Wis je de websitegegevens van je browser, dan kunnen lokale voorkeuren en spelvoortgang verdwijnen.</p>
        </div>
      </section>
      <section className="privacy-section">
        <div className="privacy-section-icon"><FileText size={18}/></div>
        <div><h2>Bestanden voor je woordenlijst</h2>
          <p>Wanneer je een Word-bestand of foto kiest in de woordenlijstbouwer, leest Leervo de inhoud in je browser om woorden en betekenissen te herkennen. Het originele bestand wordt door deze functie niet naar de Leervo-database geüpload. De woordenlijst die je daarna opslaat, wordt wel bewaard als leerdata.</p>
        </div>
      </section>
      <section className="privacy-section">
        <div className="privacy-section-icon"><LockKeyhole size={18}/></div>
        <div><h2>Je account beheren</h2>
          <p>Je kunt uitloggen via Leervo. Op dit moment heeft de website nog geen knop waarmee je zelf je account en alle bijbehorende cloudgegevens kunt verwijderen. Alleen je browsergegevens wissen verwijdert je account of de cloudback-up niet.</p>
          <p>Ook is er nog geen functie ‘Wachtwoord vergeten’ zichtbaar op het inlogscherm. Deze functies moeten veilig worden toegevoegd voordat je ze in Leervo kunt gebruiken.</p>
        </div>
      </section>
      <section className="privacy-legal-note">
        <strong>Belangrijk: deze uitleg moet nog juridisch worden gecontroleerd.</strong>
        <p>Dit is een beschrijving van de huidige werking van de app en nog geen volledige juridische privacyverklaring. Voor publicatie moeten onder andere de verantwoordelijke organisatie, contactgegevens, bewaartermijnen, rechtsgrond, eventuele verwerkers en afspraken over gegevens van minderjarigen worden gecontroleerd en aangevuld.</p>
      </section>
      <p className="privacy-updated">Bijgewerkt: 27 november 2026</p>
    </article>
  </main>
}
