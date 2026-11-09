import { useState } from 'react'
import { ArrowLeft, ArrowRight, GraduationCap, School, UserRound, Target, Clock3, Check } from 'lucide-react'

const steps = [
  { title: 'Hoe mogen we je noemen?', subtitle: 'Kies een gebruikersnaam die bij jou past.', key: 'username', icon: UserRound },
  { title: 'Op welke school zit je?', subtitle: 'Zo kunnen we lesmateriaal beter laten aansluiten. Dit veld is optioneel.', key: 'school', icon: School },
  { title: 'In welke klas zit je?', subtitle: 'Vul je klas of leerjaar in, bijvoorbeeld 2 havo of 3 vwo.', key: 'className', icon: GraduationCap },
  { title: 'Welk niveau volg je?', subtitle: 'We gebruiken dit om passende uitleg en oefenvragen te tonen.', key: 'level', icon: GraduationCap },
  { title: 'Wat wil je bereiken?', subtitle: 'Stel een dagelijks leerdoel in. Tien minuten is het minimum om je streak te behouden.', key: 'goal', icon: Target }
]

const initial = { username: '', school: '', className: '', level: '', goal: '', dailyMinutes: 10 }

export default function SetupWizard({ onComplete }) {
  const [step, setStep] = useState(0)
  const [profile, setProfile] = useState(initial)
  const [error, setError] = useState('')
  const current = steps[step]
  const Icon = current.icon
  const update = (key, value) => setProfile(previous => ({ ...previous, [key]: value }))
  const canContinue = step === 1 || (step === 0 ? profile.username.trim().length >= 2 : step === 2 ? !!profile.className.trim() : step === 3 ? !!profile.level : !!profile.goal.trim() && Number(profile.dailyMinutes) >= 10)
  const next = () => {
    if (!canContinue) { setError(step === 0 ? 'Vul een gebruikersnaam van minimaal 2 tekens in.' : step === 2 ? 'Vul je klas of leerjaar in.' : step === 3 ? 'Kies je niveau.' : 'Vul je leerdoel in en kies minimaal 10 minuten.'); return }
    setError('')
    if (step < steps.length - 1) setStep(value => value + 1)
    else onComplete({ ...profile, username: profile.username.trim(), school: profile.school.trim(), className: profile.className.trim(), goal: profile.goal.trim(), dailyMinutes: Math.max(10, Number(profile.dailyMinutes)), completedAt: new Date().toISOString() })
  }
  return <main className="setup-screen">
    <section className="setup-card">
      <div className="setup-brand"><span><GraduationCap size={22}/></span><strong>Slim<span>Leren</span></strong></div>
      <div className="setup-progress-meta"><span>JOUW LEERPLEK INSTELLEN</span><strong>{step + 1} van 5</strong></div>
      <div className="setup-progress"><span style={{ width: ((step + 1) / 5 * 100) + '%' }}/></div>
      <div className="setup-step-icon"><Icon size={25}/></div>
      <h1>{current.title}</h1><p className="setup-subtitle">{current.subtitle}</p>
      <div className="setup-fields">
        {step === 0 && <label>Gebruikersnaam<input autoFocus autoComplete="nickname" value={profile.username} maxLength={24} onChange={e => { update('username', e.target.value); setError('') }} placeholder="Bijvoorbeeld LeerSter23"/></label>}
        {step === 1 && <label>Schoolnaam <span className="setup-optional">OPTIONEEL</span><input autoFocus value={profile.school} maxLength={100} onChange={e => update('school', e.target.value)} placeholder="Naam van je school"/></label>}
        {step === 2 && <label>Klas of leerjaar<input autoFocus value={profile.className} maxLength={40} onChange={e => { update('className', e.target.value); setError('') }} placeholder="Bijvoorbeeld 2 havo"/></label>}
        {step === 3 && <label>Onderwijsniveau<select value={profile.level} onChange={e => { update('level', e.target.value); setError('') }}><option value="">Kies je niveau</option><option>vmbo-basis</option><option>vmbo-kader</option><option>vmbo-gl/tl</option><option>havo</option><option>vwo</option><option>mbo</option><option>hbo</option><option>wo</option><option>Anders</option></select></label>}
        {step === 4 && <><label>Mijn leerdoel<textarea autoFocus rows={3} maxLength={240} value={profile.goal} onChange={e => { update('goal', e.target.value); setError('') }} placeholder="Bijvoorbeeld: betere cijfers halen voor wiskunde en mijn huiswerk op tijd af hebben."/></label><label>Hoeveel minuten wil je dagelijks leren?<div className="setup-minutes"><Clock3 size={18}/><input type="number" min="10" max="240" step="5" value={profile.dailyMinutes} onChange={e => update('dailyMinutes', e.target.value)}/><span>minuten per dag</span></div><small>Minimaal 10 minuten per dag om je streak te behouden.</small></label></>}
      </div>
      {error && <p className="setup-error" role="alert">{error}</p>}
      <div className="setup-actions">{step > 0 && <button className="setup-back" type="button" onClick={() => { setStep(value => value - 1); setError('') }}><ArrowLeft size={16}/> Vorige</button>}<button className="setup-next" type="button" onClick={next}>{step === 4 ? 'Mijn leerplek starten' : 'Volgende'} {step === 4 ? <Check size={17}/> : <ArrowRight size={17}/>}</button></div>
      <p className="setup-footnote">Je gegevens helpen SlimLeren om lessen en aanbevelingen op jou af te stemmen.</p>
    </section>
  </main>
}
