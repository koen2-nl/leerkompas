import { useEffect, useMemo, useState } from 'react'
import packageInfo from '../package.json'
import { useAuth } from './auth/AuthContext.jsx'
import GeographyLessons from './GeographyLessons.jsx'
import AdminPanel from './AdminPanel.jsx'
import Planning from './Planning.jsx'
const appVersion = packageInfo.version.match(/^\d+\.\d+/)?.[0] || packageInfo.version

import { Activity, ArrowDownRight, ArrowRight, Award, BookOpen, Blocks, Brain, CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, CircleHelp, Clock3, Flame, Gamepad2, GraduationCap, LayoutDashboard, Leaf, Menu, MessageCircle, Moon, MoreHorizontal, Plus, Search, Settings2, Sparkles, Sun, Target, Trophy, Upload, X, Zap, Globe, BookOpenCheck, ShieldCheck } from 'lucide-react'

const initialSubjects = [
  { name: 'Aardrijkskunde', detail: 'Aarde, klimaat en landschappen', progress: 0, color: 'mint', icon: 'globe', due: 0 },
]
const initialCards = []
const nav = [
  { group: 'WERKPLEK', items: [{ id: 'home', label: 'Overzicht', icon: LayoutDashboard }, { id: 'subjects', label: 'Mijn lessen', icon: BookOpen }, { id: 'games', label: 'Minigames', icon: Gamepad2 }] },
  { group: 'INZICHT', items: [{ id: 'progress', label: 'Voortgang', icon: Activity }, { id: 'planning', label: 'Planning', icon: CalendarDays }] },
]
function saveLocal(key, value) {
  try { localStorage.setItem(`leerkompas:${key}`, JSON.stringify(value)); window.dispatchEvent(new CustomEvent('leerkompas:data-changed')) } catch { /* opslagmelding volgt in de interface */ }
}
function readSaved(key, fallback) {
  try { const value = localStorage.getItem(`leerkompas:${key}`); return value ? JSON.parse(value) : fallback } catch { return fallback }
}
function parseCsvData(text) {
  const sample = text.split(/\r?\n/).find(line => line.trim()) || ''
  const separators = [',', ';', '\t']
  const separator = separators.sort((a, b) => sample.split(b).length - sample.split(a).length)[0]
  const rows = []
  let row = [], cell = '', quoted = false
  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    if (char === '"' && quoted && text[i + 1] === '"') { cell += '"'; i++ }
    else if (char === '"') quoted = !quoted
    else if (char === separator && !quoted) { row.push(cell.trim()); cell = '' }
    else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && text[i + 1] === '\n') i++
      row.push(cell.trim()); if (row.some(value => value)) rows.push(row)
      row = []; cell = ''
    } else cell += char
  }
  row.push(cell.trim()); if (row.some(value => value)) rows.push(row)
  if (rows.length < 2) return { cards: [], errors: ['Voeg een kopregel en minimaal één begrippenrij toe.'] }
  const headers = rows.shift().map(value => value.toLowerCase().replace(/\s+/g, '').replace(/[._-]/g, ''))
  const subjectIndex = headers.findIndex(value => ['vak', 'subject', 'onderwerp'].includes(value))
  const questionIndex = headers.findIndex(value => ['vraag', 'begrip', 'question', 'term', 'front'].includes(value))
  const answerIndex = headers.findIndex(value => ['antwoord', 'answer', 'uitleg', 'back', 'definition'].includes(value))
  if (questionIndex < 0 || answerIndex < 0) return { cards: [], errors: ['De kopregel moet minimaal de kolommen vraag en antwoord bevatten.'] }
  const cards = [], errors = []
  rows.forEach((values, index) => {
    const q = (values[questionIndex] || '').trim(), a = (values[answerIndex] || '').trim()
    const subject = (subjectIndex >= 0 ? values[subjectIndex] : '')?.trim() || ''
    if (!q || !a) errors.push('Rij ' + (index + 2) + ': vraag of antwoord ontbreekt.')
    else cards.push({ q, a, subject })
  })
  return { cards, errors }
}

function App() {
  const { user, signOut, syncStatus, isAdmin } = useAuth()
  const profile = readSaved('profile', null)
  const visibleNav = isAdmin ? [...nav, { group: 'BEHEER', items: [{ id: 'admin', label: 'Beheer', icon: ShieldCheck }] }] : nav
  const [page, setPage] = useState('home')
  const [lessonActive, setLessonActive] = useState(false)
  const [dark, setDark] = useState(() => readSaved('dark', false))
  const [accent, setAccent] = useState(() => readSaved('accent', 'violet'))
  const [mobileOpen, setMobileOpen] = useState(false)
  const [subjects, setSubjects] = useState(() => { const saved = readSaved('subjects', initialSubjects).filter(s => !['Biologie','Geschiedenis','Wiskunde'].includes(s.name)); return saved.length ? saved : initialSubjects })
  const [cards, setCards] = useState(() => readSaved('cards', initialCards).filter(c => !['Wat is fotosynthese?','Wat betekent industrialisatie?','Wat is de richtingscoëfficiënt?'].includes(c.q)))
  const [cardIndex, setCardIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [known, setKnown] = useState(() => readSaved('known', []))
  const [studyStats, setStudyStats] = useState(() => readSaved('studyStats', { xp: 0, cardsLearned: 0, sessions: [] }))
  const [completedLessons, setCompletedLessons] = useState(() => readSaved('completedLessons', []))
  const [planning, setPlanning] = useState(() => readSaved('planning', []))
  const [widgets, setWidgets] = useState(() => readSaved('widgets', ['focus', 'subjects', 'week']))
  const [showWidgetMenu, setShowWidgetMenu] = useState(false)
  const [showAddSubject, setShowAddSubject] = useState(false)
  const [showAddCard, setShowAddCard] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [importText, setImportText] = useState('')
  const [importFileName, setImportFileName] = useState('')
  const [cardQuestion, setCardQuestion] = useState('')
  const [cardAnswer, setCardAnswer] = useState('')
  const [cardSubject, setCardSubject] = useState('')
  const [subjectName, setSubjectName] = useState('')
  const [query, setQuery] = useState('')
  const [gameScore, setGameScore] = useState(0)
  const [quizAnswer, setQuizAnswer] = useState('')
  const [quizDone, setQuizDone] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [toast, setToast] = useState('')
  const [headerNow, setHeaderNow] = useState(() => new Date())
  useEffect(() => {
    const updateHeaderClock = () => setHeaderNow(new Date())
    const interval = window.setInterval(updateHeaderClock, 1000)
    return () => window.clearInterval(interval)
  }, [])
  const headerDate = headerNow.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const headerTime = headerNow.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
  useEffect(() => { try { saveLocal('subjects', subjects) } catch { notify('Opslaan lukte niet. Controleer je browserinstellingen.') } }, [subjects])
  useEffect(() => { try { saveLocal('cards', cards) } catch { notify('Opslaan lukte niet. Controleer je browserinstellingen.') } }, [cards])
  useEffect(() => { try { saveLocal('dark', dark) } catch {} }, [dark])
  useEffect(() => { try { saveLocal('accent', accent) } catch {} }, [accent])
  useEffect(() => { try { saveLocal('widgets', widgets) } catch {} }, [widgets])
  useEffect(() => { try { saveLocal('known', known) } catch {} }, [known])
  useEffect(() => { try { saveLocal('studyStats', studyStats) } catch {} }, [studyStats])
  useEffect(() => { try { saveLocal('completedLessons', completedLessons) } catch {} }, [completedLessons])
  useEffect(() => { try { saveLocal('planning', planning) } catch {} }, [planning])
  const current = cards[cardIndex]
  const weekStart = Date.now() - 7 * 24 * 60 * 60 * 1000
  const sessionsThisWeek = studyStats.sessions.filter(session => new Date(session.at).getTime() >= weekStart)
  const weeklyGoalProgress = Math.min(100, Math.round((sessionsThisWeek.length / 6) * 100))
  const activeDays = new Set(studyStats.sessions.map(session => new Date(session.at).toLocaleDateString('nl-NL'))).size
  const importPreview = useMemo(() => parseCsvData(importText), [importText])
  const filteredSubjects = useMemo(() => subjects.filter(s => s.name.toLowerCase().includes(query.toLowerCase())), [subjects, query])
  const notify = (message) => { setToast(message); window.setTimeout(() => setToast(''), 2200) }
  const go = (id) => { setPage(id); setMobileOpen(false); setFlipped(false) }
  const addSubject = (e) => { e.preventDefault(); const name = subjectName.trim(); if (!name || subjects.some(s => s.name.toLowerCase() === name.toLowerCase())) return; setSubjects([...subjects, { name, detail: 'Nieuw onderwerp', progress: 0, color: 'blue', icon: 'book', due: 0 }]); setSubjectName(''); setShowAddSubject(false); notify('Je vak is toegevoegd en opgeslagen!') }
  const addCard = (e) => { e.preventDefault(); if (!cardQuestion.trim() || !cardAnswer.trim() || !cardSubject) return; setCards([...cards, { q: cardQuestion.trim(), a: cardAnswer.trim(), subject: cardSubject }]); setSubjects(subjects.map(s => s.name === cardSubject ? { ...s, due: (s.due || 0) + 1 } : s)); setCardQuestion(''); setCardAnswer(''); setCardSubject(''); setShowAddCard(false); notify('Je flashcard is toegevoegd en opgeslagen!') }
  const importCards = (e) => {
    e.preventDefault()
    const parsed = parseCsvData(importText)
    if (!parsed.cards.length || parsed.errors.length) return
    const newSubjects = [...subjects]
    const imported = parsed.cards.map(card => {
      let subject = card.subject || newSubjects[0]?.name || 'Algemeen'
      if (!newSubjects.some(item => item.name.toLowerCase() === subject.toLowerCase())) {
        newSubjects.push({ name: subject, detail: 'Geïmporteerd uit CSV', progress: 0, color: 'blue', icon: 'book', due: 0 })
      }
      return { q: card.q, a: card.a, subject }
    })
    setSubjects(newSubjects.map(subject => ({ ...subject, due: (subject.due || 0) + imported.filter(card => card.subject.toLowerCase() === subject.name.toLowerCase()).length })))
    setCards([...cards, ...imported])
    setImportText(''); setImportFileName(''); setShowImport(false)
    notify(imported.length + ' flashcards geïmporteerd en opgeslagen!')
  }
  const removeCard = (index) => { setCards(cards.filter((_, i) => i !== index)); setCardIndex(0); setFlipped(false); notify('Flashcard verwijderd.') }
  const nextCard = () => { setCardIndex((cardIndex + 1) % cards.length); setFlipped(false) }
  const completeLesson = (id) => { if (!completedLessons.includes(id)) { setCompletedLessons(previous => [...previous, id]); setStudyStats(previous => ({ ...previous, xp: previous.xp + 20, sessions: [...previous.sessions, { at: new Date().toISOString(), subject: 'Aardrijkskunde' }] })); notify('+20 XP · Les afgerond!') } else notify('Les opnieuw afgerond · geen extra XP') }
  const toggleWidget = (id) => setWidgets(widgets.includes(id) ? widgets.filter(w => w !== id) : [...widgets, id])
  const title = ({home:profile?.username ? `Goedemorgen, ${profile.username}!` : 'Goedemorgen!',subjects:'Mijn lessen',study:'Slim herhalen',games:'Speel & leer',progress:'Jouw voortgang',planning:'Mijn planning',admin:'Beheer'})[page]
  return <div className={`app ${dark ? 'dark' : ''}`} data-accent={accent}>
    <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
      <div className="brand"><div className="brand-mark"><GraduationCap size={22}/></div><span>Slim<span>Leren</span></span><button className="icon-btn mobile-close" onClick={()=>setMobileOpen(false)} aria-label="Menu sluiten"><X size={18}/></button></div>
      <div className="profile"><div className="avatar">K</div><div><strong>{user?.email?.split('@')[0] || 'Mijn leerplek'}</strong><small>Persoonlijke ruimte</small></div><ChevronDown size={15}/></div>
      {visibleNav.map(group=><div className="nav-group" key={group.group}><p>{group.group}</p>{group.items.map(item=><button key={item.id} disabled={lessonActive} className={`nav-item ${page===item.id?'active':''}`} onClick={()=>go(item.id)}><item.icon size={18}/>{item.label}{item.id==='study'&&<span className="nav-dot"/>}</button>)}</div>)}
      <div className="sidebar-bottom"><div className="streak-card"><div className="streak-icon"><Flame size={18}/></div><div><strong>{activeDays} actieve dagen</strong><small>Elke oefensessie telt mee</small></div></div><button className="nav-item" onClick={()=>setShowSettings(true)}><Settings2 size={18}/>Instellingen</button><div className="sidebar-foot"><span className="online-dot"/> Demo-omgeving <span>v{appVersion} beta</span></div></div>
    </aside>
    {mobileOpen&&<div className="scrim" onClick={()=>setMobileOpen(false)}/>}
    <main className="main">
      <header className="topbar"><button className="icon-btn menu-toggle" onClick={()=>setMobileOpen(true)} aria-label="Menu openen"><Menu/></button><div className="breadcrumbs">Mijn leerplek <ChevronRight size={14}/> <strong>{title}</strong></div><div className="top-actions"><div className="date-pill"><span className="header-date"><CalendarDays size={15}/>{headerDate}</span><span className="header-clock"><Clock3 size={15}/><time>{headerTime}</time></span></div><button className="icon-btn" onClick={()=>setDark(!dark)} aria-label="Wissel thema">{dark?<Sun size={18}/>:<Moon size={18}/>}</button><span className="sync-indicator" title={syncStatus === "saved" ? "Alles gesynchroniseerd" : "Synchroniseren"}>{syncStatus === "saving" ? "Opslaan…" : syncStatus === "saved" ? "✓ Opgeslagen" : "Verbonden"}</span><button className="avatar small" title="Uitloggen" onClick={signOut}><X size={15}/></button></div></header>
      <div className="content">
        <div className="page-heading"><div><div className="eyebrow"><Sparkles size={14}/> JOUW PERSOONLIJKE LEERPLEK</div><h1>{title}</h1><p>{page==='home'?'Klaar om vandaag iets nieuws te ontdekken?':page==='study'?'Korte herhaalmomenten helpen je kennis beter onthouden.':'Alles op één plek. Jij bepaalt je eigen tempo.'}</p></div>{page==='home'&&<button className="primary-btn" onClick={()=>go('subjects')}><Zap size={16}/> Start leersessie</button>}</div>
        {page==='home'&&<><section className="welcome-banner"><div className="welcome-copy"><span className="banner-tag"><Leaf size={13}/> KLEINE STAPPEN, GROOT RESULTAAT</span><h2>Elke dag een beetje<br/> <em>wijzer.</em></h2><p>Je hebt vandaag 24 minuten gepland. Een mooi moment om verder te groeien.</p><button className="banner-btn" onClick={()=>go('subjects')}>Verder leren <ArrowRight size={16}/></button></div><div className="banner-art"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="book-illustration"><BookOpen size={76} strokeWidth={1.2}/><Sparkles className="sparkle s1"/><Sparkles className="sparkle s2"/></div><div className="floating-note note-a"><Sparkles size={13}/> Goed bezig!</div><div className="floating-note note-b">+ 20 XP</div></div></section>
        <section className="stats-grid"><Stat icon={Flame} label="Actieve dagen" value={activeDays} note="Sinds je start" tone="orange"/><Stat icon={Zap} label="Verdiende XP" value={studyStats.xp} note="20 XP per afgeronde les" tone="purple"/><Stat icon={Target} label="Deze week" value={`${weeklyGoalProgress}%`} note={`${sessionsThisWeek.length} van 6 leermomenten`} tone="green"/><Stat icon={BookOpen} label="Afgeronde lessen" value={completedLessons.length} note="Lessen voltooid" tone="blue"/></section>
        <div className="section-heading"><div><h3>Jouw leerplek</h3><p>Een overzicht van waar je mee bezig bent.</p></div><div className="widget-control"><button className="soft-btn" onClick={()=>setShowWidgetMenu(!showWidgetMenu)}><Settings2 size={15}/> Aanpassen <ChevronDown size={14}/></button>{showWidgetMenu&&<div className="dropdown"><strong>Widgets tonen</strong>{[['focus','Focus van vandaag'],['subjects','Mijn vakken'],['week','Weekdoel']].map(([id,label])=><label key={id}><input type="checkbox" checked={widgets.includes(id)} onChange={()=>toggleWidget(id)}/>{label}</label>)}</div>}</div></div>
        <div className="dashboard-grid">{widgets.includes('focus')&&<section className="panel focus-panel"><div className="panel-head"><div><span className="panel-kicker">AAN DE SLAG</span><h3>Focus van vandaag</h3></div><span className="icon-tile violet"><Target size={18}/></span></div><div className="focus-task"><div className="task-icon"><Globe size={19}/></div><div><strong>Aardrijkskunde · Vulkanen</strong><small>8 begrippen · ± 12 min</small></div><span className="task-label">AANBEVOLEN</span></div><div className="focus-task"><div className="task-icon"><BookOpenCheck size={19}/></div><div><strong>Aardrijkskunde · Klimaat</strong><small>4 opgaven · ± 10 min</small></div></div><button className="panel-link" onClick={()=>go('subjects')}>Start je focusmoment <ArrowRight size={15}/></button></section>}
        {widgets.includes('subjects')&&<section className="panel subjects-panel"><div className="panel-head"><div><span className="panel-kicker">BLIJF IN BEWEGING</span><h3>Verder met je vakken</h3></div><button className="text-btn" onClick={()=>go('subjects')}>Alles bekijken <ArrowRight size={14}/></button></div>{subjects.slice(0,3).map(s=><SubjectRow key={s.name} subject={s}/>)}</section>}
        {widgets.includes('week')&&<section className="panel week-panel"><div className="panel-head"><div><span className="panel-kicker">JOUW DOEL</span><h3>Week in beeld</h3></div><span className="icon-tile green"><Trophy size={18}/></span></div><div className="week-number">{weeklyGoalProgress}<span>%</span></div><p className="muted">Je weekdoel is 6 leermomenten.</p><div className="progress-track"><div style={{width:weeklyGoalProgress+'%'}}/></div><div className="week-foot"><span>{sessionsThisWeek.length} van 6 leermomenten</span><strong>{Math.max(0, 6-sessionsThisWeek.length)} te gaan</strong></div><div className="week-days">{['M','D','W','D','V','Z','Z'].map((d,i)=><div key={i} className={i<4?'day done':'day'}><span>{d}</span><b>{i<4?<Check size={13}/>:i===4?'•':'·'}</b></div>)}</div></section>}</div>
        </>}
        {page==='subjects'&&<GeographyLessons completedLessons={completedLessons} onComplete={completeLesson} onActiveChange={setLessonActive} onCatalogLoaded={lessonIds=>setCompletedLessons(previous=>previous.filter(id=>lessonIds.includes(id)))} profile={profile}/>}
        {page==='admin'&&isAdmin&&<AdminPanel/>}
        {false&&page==='subjects'&&<><div className="toolbar"><div className="search-box"><Search size={17}/><input placeholder="Zoek een vak..." value={query} onChange={e=>setQuery(e.target.value)}/></div><div className="toolbar-actions"><button className="soft-btn" onClick={()=>setShowImport(true)}><Upload size={15}/> Importeer CSV</button><button className="soft-btn" onClick={()=>setShowAddCard(true)}><Plus size={16}/> Begrip toevoegen</button><button className="primary-btn" onClick={()=>setShowAddSubject(true)}><Plus size={16}/> Vak toevoegen</button></div></div><div className="subject-grid">{filteredSubjects.map(s=><div className="subject-card" key={s.name}><div className="subject-card-top"><div className={`subject-emoji ${s.color}`}>{s.icon}</div><button className="icon-btn"><MoreHorizontal size={18}/></button></div><h3>{s.name}</h3><p>{s.detail}</p><div className="subject-progress-label"><span>Beheersing</span><strong>{s.progress}%</strong></div><div className="progress-track"><div style={{width:s.progress+'%'}}/></div><div className="subject-card-foot"><span><BookOpen size={14}/> {s.due} begrippen</span><button onClick={()=>go('subjects')}>Oefenen <ArrowRight size={14}/></button></div></div>)}</div>{filteredSubjects.length===0&&<div className="empty-state">Geen vakken gevonden. Probeer een andere zoekterm.</div>}<section className="panel material-panel"><div className="panel-head"><div><span className="panel-kicker">JOUW EIGEN MATERIAAL</span><h3>Mijn begrippen ({cards.length})</h3></div><button className="text-btn" onClick={()=>setShowAddCard(true)}><Plus size={14}/> Nieuw begrip</button></div>{cards.length===0?<p className="muted">Je hebt nog geen begrippen. Voeg je eerste flashcard toe.</p>:<div className="material-list">{cards.map((card,i)=><div className="material-row" key={`${card.subject}-${i}`}><div><strong>{card.q}</strong><small>{card.subject} · {card.a}</small></div><button className="icon-btn" onClick={()=>removeCard(i)} aria-label="Begrip verwijderen"><X size={16}/></button></div>)}</div>}</section></>}
        {page==='study'&&(cards.length===0?<section className="panel empty-study"><h3>Nog geen flashcards</h3><p>Voeg eerst een begrip toe bij Mijn leerstof.</p><button className="primary-btn" onClick={()=>go('subjects')}>Naar mijn leerstof <ArrowRight size={16}/></button></section>:<div className="study-layout"><section className="panel study-card-panel"><div className="study-top"><span className="panel-kicker">FLASHCARDS · {current.subject.toUpperCase()}</span><span className="card-count">{cardIndex+1} / {cards.length}</span></div><div className="study-progress"><div style={{width:((cardIndex+1)/cards.length*100)+'%'}}/></div><button className={`flashcard ${flipped?'flipped':''}`} onClick={()=>setFlipped(!flipped)}><span className="flip-hint">{flipped?'ANTWOORD':'BEGRIP'} · KLIK OM TE DRAAIEN</span><strong>{flipped?current.a:current.q}</strong><span className="flip-bottom">{flipped?'Goed onthouden?':'Weet jij het antwoord?'} <ArrowDownRight size={17}/></span></button><div className="study-actions"><button className="soft-btn" onClick={()=>nextCard(false)}><ChevronLeft size={16}/> Later opnieuw</button><button className="primary-btn" onClick={()=>nextCard(true)}><Check size={16}/> Ik wist het</button></div><p className="study-footnote"><CircleHelp size={14}/> Je flashcards en voortgang worden veilig met je account gesynchroniseerd.</p></section><aside className="panel study-side"><span className="panel-kicker">JOUW SESSIE</span><h3>Rustig opbouwen</h3><p>Herhaal begrippen in korte rondes. Zo ontdek je wat je al goed kent.</p><div className="session-stat"><span>Bekend in deze sessie</span><strong>{known.length}</strong></div><div className="session-stat"><span>Nog te oefenen</span><strong>{cards.length-known.length}</strong></div><div className="tip-box"><Sparkles size={17}/><p><strong>Leertip</strong><br/>Probeer eerst zelf het antwoord te bedenken voordat je de kaart omdraait.</p></div></aside></div>)}
        {page==='games'&&<><div className="games-intro"><div><h2>Leren mag leuk zijn.</h2><p>Even iets anders? Daag jezelf uit met een korte leergame.</p></div><div className="game-xp"><Trophy size={18}/> <strong>{gameScore*10} XP</strong><span>demo-score</span></div></div><div className="games-grid"><GameCard icon={Brain} title="Memory Match" desc="Vind de paren en train je geheugen." tag="GEHEUGEN" onClick={()=>notify('Memory Match komt in een volgende versie!')}/><GameCard icon={Zap} title="Quiz Rush" desc="Beantwoord vragen en blijf in je flow." tag="SNELHEID" onClick={()=>go('quiz')}/><GameCard icon={Blocks} title="Knowledge Blocks" desc="Bouw je kennis blokje voor blokje op." tag="KENNIS" onClick={()=>notify('Knowledge Blocks komt in een volgende versie!')}/><GameCard icon={Search} title="Waar of niet waar" desc="Test hoe goed je feiten kunt herkennen." tag="INZICHT" onClick={()=>notify('Deze game komt in een volgende versie!')}/><GameCard icon={MessageCircle} title="Woordensprint" desc="Oefen begrippen in een vlot tempo." tag="TAAL" onClick={()=>go('subjects')}/><GameCard icon={Trophy} title="Boss Battle" desc="Een grotere uitdaging voor je kennis." tag="UITDAGING" onClick={()=>notify('Boss Battle komt in een volgende versie!')}/></div></>}
        {page==='quiz'&&<section className="panel quiz-panel"><button className="text-btn" onClick={()=>go('games')}><ChevronLeft size={15}/> Terug naar games</button><span className="panel-kicker">QUIZ RUSH · AARDRIJKSKUNDE</span><h2>Hoe heet gesmolten gesteente onder de grond?</h2><div className="quiz-options">{['Lava','Magma','As','Graniet'].map(a=><button key={a} className={quizAnswer===a?'selected':''} onClick={()=>{setQuizAnswer(a);setQuizDone(false)}}>{a}{quizDone&&a==='Magma'&&<Check size={16}/>}</button>)}</div>{quizDone&&<div className="quiz-feedback">{quizAnswer==='Magma'?'Helemaal goed! Onder de grond heet gesmolten gesteente magma.':'Nog niet helemaal. Het juiste antwoord is magma.'}</div>}<button className="primary-btn" disabled={!quizAnswer} onClick={()=>{setQuizDone(true);if(quizAnswer==='De celkern')setGameScore(gameScore+1)}}>Controleer antwoord <ArrowRight size={16}/></button></section>}
        {page==='progress'&&<><section className="stats-grid"><Stat icon={Zap} label="Totaal XP" value={studyStats.xp} note="20 XP per afgeronde les" tone="purple"/><Stat icon={BookOpen} label="Afgeronde lessen" value={completedLessons.length} note="Alle sessies" tone="green"/><Stat icon={Flame} label="Actieve dagen" value={activeDays} note="Sinds je start" tone="orange"/><Stat icon={Award} label="Leermomenten" value={studyStats.sessions.length} note="Totaal" tone="blue"/></section><section className="panel progress-panel"><h3>Voortgang per vak</h3>{subjects.map(s=><SubjectRow key={s.name} subject={s}/>)}</section></>}
        {page==='planning'&&<Planning planning={planning} setPlanning={setPlanning} subjects={subjects}/>}
        <footer className="footer"><span>SlimLeren <b>·</b> Leren op jouw manier. <b>·</b> v{appVersion} beta</span><span>Je leerstof wordt veilig met je account gesynchroniseerd</span></footer>
      </div>
    </main>
    {showAddSubject&&<div className="modal-backdrop" onClick={()=>setShowAddSubject(false)}><form className="modal" onSubmit={addSubject} onClick={e=>e.stopPropagation()}><button type="button" className="modal-close" onClick={()=>setShowAddSubject(false)}><X size={18}/></button><span className="panel-kicker">NIEUW VAK</span><h2>Wat wil je leren?</h2><p>Voeg een vak toe aan je persoonlijke leerplek.</p><input autoFocus value={subjectName} onChange={e=>setSubjectName(e.target.value)} placeholder="Bijv. Aardrijkskunde" maxLength={40}/><button className="primary-btn" type="submit" disabled={!subjectName.trim()}>Vak toevoegen <ArrowRight size={16}/></button></form></div>}
    {showAddCard&&<div className="modal-backdrop" onClick={()=>setShowAddCard(false)}><form className="modal" onSubmit={addCard} onClick={e=>e.stopPropagation()}><button type="button" className="modal-close" onClick={()=>setShowAddCard(false)}><X size={18}/></button><span className="panel-kicker">NIEUW BEGRIP</span><h2>Maak een flashcard</h2><p>Schrijf een vraag of begrip en het antwoord dat je wilt oefenen.</p><label className="field-label">Vak<select value={cardSubject} onChange={e=>setCardSubject(e.target.value)} required><option value="">Kies een vak</option>{subjects.map(s=><option key={s.name} value={s.name}>{s.name}</option>)}</select></label><label className="field-label">Vraag of begrip<input autoFocus value={cardQuestion} onChange={e=>setCardQuestion(e.target.value)} placeholder="Bijv. Wat is fotosynthese?" maxLength={180} required/></label><label className="field-label">Antwoord<textarea value={cardAnswer} onChange={e=>setCardAnswer(e.target.value)} placeholder="Typ hier de uitleg of het antwoord..." rows={4} maxLength={1200} required/></label><button className="primary-btn" type="submit" disabled={!cardQuestion.trim()||!cardAnswer.trim()||!cardSubject}>Flashcard opslaan <ArrowRight size={16}/></button></form></div>}
    {showImport&&<div className="modal-backdrop" onClick={()=>setShowImport(false)}><form className="modal import-modal" onSubmit={importCards} onClick={e=>e.stopPropagation()}><button type="button" className="modal-close" onClick={()=>setShowImport(false)}><X size={18}/></button><span className="panel-kicker">LEERSTOF IMPORTEREN</span><h2>Importeer flashcards</h2><p>Kies een CSV-bestand of plak de inhoud hieronder. Gebruik de kolommen <strong>vak,vraag,antwoord</strong>. Komma's, puntkomma's en tabs worden ondersteund.</p><label className="field-label">CSV-bestand<input type="file" accept=".csv,text/csv" onChange={async e=>{const file=e.target.files?.[0];if(file){setImportFileName(file.name);setImportText(await file.text())}}}/></label>{importFileName&&<p className="import-filename">Gekozen bestand: {importFileName}</p>}<label className="field-label">Of plak CSV-tekst<textarea value={importText} onChange={e=>{setImportText(e.target.value);setImportFileName('')}} placeholder={'vak,vraag,antwoord\nBiologie,Wat is een cel?,De kleinste levende bouwsteen.'} rows={6} required/></label><div className="import-preview"><strong>Voorbeeldcontrole</strong><span>{importPreview.cards.length} geldige flashcards gevonden</span>{importPreview.errors.length>0&&<ul>{importPreview.errors.slice(0,4).map((error,i)=><li key={i}>{error}</li>)}</ul>}</div><button className="primary-btn" type="submit" disabled={!importPreview.cards.length||importPreview.errors.length>0}>Importeer {importPreview.cards.length} flashcards <ArrowRight size={16}/></button></form></div>}
    {showSettings&&<div className="modal-backdrop" onClick={()=>setShowSettings(false)}><section className="modal" onClick={e=>e.stopPropagation()}><button className="modal-close" onClick={()=>setShowSettings(false)}><X size={18}/></button><span className="panel-kicker">JOUW LEERPLEK</span><h2>Instellingen</h2><p>Pas de uitstraling aan zoals jij prettig leert.</p><div className="setting-row"><div><strong>Donker thema</strong><small>Fijn voor 's avonds</small></div><button className={'switch '+(dark?'on':'')} onClick={()=>setDark(!dark)}><span/></button></div><div className="setting-row"><div><strong>Accentkleur</strong><small>Kies jouw favoriet</small></div><div className="swatches">{['violet','blue','green','coral'].map(c=><button aria-label={c} key={c} className={'swatch '+c+(accent===c?' chosen':'')} onClick={()=>setAccent(c)}/>)}</div></div><p className="settings-note">Je instellingen worden automatisch op dit apparaat bewaard. Wissen van browsergegevens kan ze verwijderen.</p></section></div>}
    {toast&&<div className="toast"><Check size={16}/>{toast}</div>}
  </div>
}
function Stat({icon:Icon,label,value,note,tone}){return <div className="stat-card"><div className={'stat-icon '+tone}><Icon size={18}/></div><div><span>{label}</span><strong>{value}</strong><small>{note}</small></div><ArrowDownRight className="stat-arrow" size={17}/></div>}
function SubjectRow({subject:s}){const SubjectIcon=s.icon==='globe'?Globe:BookOpen;return <div className="subject-row"><div className={'subject-emoji '+s.color}><SubjectIcon size={19}/></div><div className="subject-info"><strong>{s.name}</strong><small>{s.detail}</small></div><div className="subject-bar"><div className="progress-track"><div style={{width:s.progress+'%'}}/></div></div><strong className="subject-percent">{s.progress}%</strong></div>}
function GameCard({icon:Icon,title,desc,tag,onClick}){return <button className="game-card" onClick={onClick}><div className="game-art"><Icon size={34} strokeWidth={1.7}/><span><ArrowUpRightIcon/></span></div><span className="panel-kicker">{tag}</span><h3>{title}</h3><p>{desc}</p><div className="game-play">Speel nu <ArrowRight size={15}/></div></button>}
function ArrowUpRightIcon(){return <ArrowDownRight size={17}/>}
export default App
