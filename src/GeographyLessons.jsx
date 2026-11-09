import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, BookOpen, Check, ChevronLeft, Clock3, Compass, Play, RotateCcw, Save, X, Zap } from 'lucide-react'
import { supabase } from './auth/supabase.js'

const demoLesson = {
  id: 'volcano',
  title: 'Vulkanen en aardbevingen',
  subtitle: 'Wat gebeurt er onder het aardoppervlak?',
  subject: 'Aardrijkskunde',
  topic: 'Natuurverschijnselen',
  level: 'Onderbouw',
  difficulty: 'Basis',
  target_class: '',
  target_school: '',
  duration: '10–12 min',
  intro: 'Je ontdekt hoe aardplaten bewegen, waarom aardbevingen ontstaan en hoe vulkanen werken. Elk onderdeel begint met uitleg en een voorbeeld. Daarna oefen je meteen met vragen over precies dat onderdeel.',
  sections: [
    { title: 'Aardplaten', icon: Compass, explanation: 'De buitenste laag van de aarde is verdeeld in grote en kleine stukken. Die stukken noemen we aardplaten. Ze sluiten op elkaar aan als een soort puzzel en bewegen heel langzaam, meestal maar enkele centimeters per jaar.', example: 'Vergelijk de aardplaten met stukken van een gebarsten eierschaal: ze liggen tegen elkaar, maar kunnen heel langzaam verschuiven.', questions: [{ type: 'multiple_choice', q: 'Hoe noemen we de grote stukken waaruit de aardkorst bestaat?', options: ['Wolkenlagen', 'Aardplaten', 'Luchtstromen'], answer: 1, feedback: 'De aardkorst bestaat uit aardplaten die heel langzaam bewegen.' }, { type: 'multiple_choice', q: 'Hoe snel bewegen aardplaten meestal?', options: ['Enkele centimeters per jaar', 'Enkele kilometers per dag', 'Helemaal niet'], answer: 0, feedback: 'Aardplaten bewegen langzaam: meestal enkele centimeters per jaar.' }] },
    { title: 'Aardbevingen', icon: Compass, explanation: 'Aardplaten kunnen naar elkaar toe bewegen, uit elkaar gaan of langs elkaar schuiven. Soms blijven de randen tijdelijk vastzitten. De spanning bouwt dan op. Wanneer die spanning plotseling vrijkomt, gaat de grond trillen: dat is een aardbeving.', example: 'Een aardbeving ontstaat dus door beweging en spanning in de aardkorst, niet door het weer.', questions: [{ type: 'multiple_choice', q: 'Waardoor ontstaat een aardbeving meestal?', options: ['Door langdurige regen', 'Door de aantrekkingskracht van de maan', 'Door spanning die tussen aardplaten vrijkomt'], answer: 2, feedback: 'Als opgebouwde spanning bij aardplaten plotseling vrijkomt, trilt de grond.' }] },
    { title: 'Vulkanen', icon: BookOpen, explanation: 'Diep in de aarde kan gesteente zo heet worden dat het smelt. Dit gesmolten gesteente heet magma. Als magma via een opening naar buiten komt, noemen we het lava. Bij een uitbarsting kunnen ook as en gassen vrijkomen.', example: 'Onthoud het verschil: onder de grond heet het magma, aan het aardoppervlak heet het lava.', questions: [{ type: 'multiple_choice', q: 'Hoe heet gesmolten gesteente onder de grond?', options: ['Lava', 'Magma', 'As'], answer: 1, feedback: 'Onder de grond heet gesmolten gesteente magma. Aan het oppervlak noemen we het lava.' }, { type: 'multiple_choice', q: 'Wat kan bij een vulkaanuitbarsting naar buiten komen?', options: ['Lava, as en gassen', 'Alleen water', 'Sneeuw en zand'], answer: 0, feedback: 'Bij een uitbarsting kunnen lava, as en gassen vrijkomen.' }] }
  ]
}

function normalizeLesson(row) {
  const sections = (row.content?.sections || []).map(section => ({
    title: section.title || row.topic || 'Onderdeel',
    icon: Compass,
    explanation: section.explanation || '',
    example: section.example || '',
    questions: (section.questions || []).map(question => ({
      type: question.type === 'open' ? 'open' : question.type === 'true_false' ? 'true_false' : 'multiple_choice',
      q: question.q || question.question || '',
      options: Array.isArray(question.options) ? question.options : [],
      answer: question.answer,
      feedback: question.feedback || question.explanation || 'Bekijk het antwoord en de uitleg nog eens.'
    }))
  })).filter(section => section.questions.length)
  if (!sections.length) return null
  const count = sections.reduce((total, section) => total + section.questions.length, 0)
  return {
    id: row.id,
    title: row.title,
    subtitle: row.description || row.topic || row.subject || 'Oefen met deze les.',
    intro: row.description || 'Bekijk de uitleg en oefen daarna met de vragen.',
    subject: row.subject || 'Algemeen',
    topic: row.topic || sections[0]?.title || 'Algemeen',
    level: row.level || 'Alle niveaus',
    difficulty: row.difficulty || 'Basis',
    target_class: row.target_class || '',
    target_school: row.target_school || '',
    mode: row.content?.mode || 'normal',
    duration: Math.max(2, count * 2) + ' min',
    sections
  }
}

const progressKey = id => 'leerkompas:lessonProgress:' + id
const readProgress = id => {
  try { return JSON.parse(localStorage.getItem(progressKey(id)) || 'null') } catch { return null }
}
const saveProgress = (id, value) => {
  try {
    localStorage.setItem(progressKey(id), JSON.stringify(value))
    window.dispatchEvent(new CustomEvent('leerkompas:data-changed'))
  } catch { /* De les blijft in het huidige scherm beschikbaar. */ }
}
const clearProgress = id => {
  try { localStorage.removeItem(progressKey(id)); window.dispatchEvent(new CustomEvent('leerkompas:data-changed')) } catch { /* Geen opgeslagen voortgang om te wissen. */ }
}
const normalizeText = value => String(value || '').trim().toLocaleLowerCase('nl-NL')
const profileLevelMatch = (item, profile) => {
  if (!profile?.level || item.level === 'Alle niveaus' || normalizeText(item.level) === normalizeText(profile.level)) return true
  if (item.level === 'Onderbouw' || item.level === 'Bovenbouw') {
    const year = Number(String(profile.className || '').match(/^\s*(\d+)/)?.[1])
    if (!year) return true
    return item.level === (year <= 3 ? 'Onderbouw' : 'Bovenbouw')
  }
  return false
}
const goalMatch = (item, profile) => {
  const ignored = new Set(['voor', 'halen', 'mijn', 'beter', 'betere', 'leren', 'meer', 'goed', 'goede', 'zijn', 'met', 'van', 'een', 'het', 'de', 'en', 'op', 'om', 'dat', 'wil', 'kan', 'hebben', 'tijd'])
  const terms = normalizeText(profile?.goal).split(/[^a-z0-9À-ÿ]+/i).filter(term => term.length > 3 && !ignored.has(term))
  const lessonText = normalizeText([item.title, item.subtitle, item.subject, item.topic, item.intro].join(' '))
  return terms.some(term => lessonText.includes(term))
}

export default function GeographyLessons({ completedLessons = [], onComplete, onActiveChange, profile }) {
  const [catalogLessons, setCatalogLessons] = useState([])
  const [catalogLoading, setCatalogLoading] = useState(true)
  const [catalogError, setCatalogError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [subjectFilter, setSubjectFilter] = useState('alles')
  const [topicFilter, setTopicFilter] = useState('alles')
  const [levelFilter, setLevelFilter] = useState(() => profile?.level ? 'mijn-niveau' : 'alles')
  const [statusFilter, setStatusFilter] = useState('alles')
  const [difficultyFilter, setDifficultyFilter] = useState('alles')
  const [selectedLesson, setSelectedLesson] = useState(null)
  const [progress, setProgress] = useState(null)
  const [active, setActive] = useState(false)
  const [stage, setStage] = useState('explanation')
  const [sectionIndex, setSectionIndex] = useState(0)
  const [questionIndex, setQuestionIndex] = useState(0)
  const [answer, setAnswer] = useState(null)
  const [checked, setChecked] = useState(false)
  const [showStartChoice, setShowStartChoice] = useState(false)
  const [showStopConfirm, setShowStopConfirm] = useState(false)
  const [finished, setFinished] = useState(false)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      if (!supabase) { setCatalogLoading(false); return }
      const { data, error } = await supabase.from('lesson_catalog').select('*').order('created_at', { ascending: false })
      if (cancelled) return
      if (error) setCatalogError('De lessen konden niet worden geladen: ' + error.message)
      else setCatalogLessons((data || []).map(normalizeLesson).filter(Boolean))
      setCatalogLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [])

  const lessons = catalogLessons.length ? catalogLessons : [demoLesson]
  const section = selectedLesson?.sections?.[sectionIndex]
  const question = section?.questions?.[questionIndex]
  const totalQuestions = useMemo(() => selectedLesson?.sections?.reduce((sum, item) => sum + item.questions.length, 0) || 0, [selectedLesson])
  const completedQuestions = useMemo(() => selectedLesson?.sections?.slice(0, sectionIndex).reduce((sum, item) => sum + item.questions.length, 0) + (stage === 'questions' ? questionIndex : 0) || 0, [selectedLesson, sectionIndex, stage, questionIndex])
  const percent = finished ? 100 : totalQuestions ? Math.round((completedQuestions / totalQuestions) * 100) : 0

  useEffect(() => {
    document.body.classList.toggle('lesson-open', active)
    return () => document.body.classList.remove('lesson-open')
  }, [active])

  useEffect(() => {
    if (active && !finished && selectedLesson) saveProgress(selectedLesson.id, { sectionIndex, questionIndex, stage, updatedAt: new Date().toISOString() })
  }, [active, finished, selectedLesson, sectionIndex, questionIndex, stage])

  const begin = (restart = false, item = selectedLesson) => {
    if (!item) return
    const saved = !restart ? readProgress(item.id) : null
    const next = saved || { sectionIndex: 0, questionIndex: 0, stage: 'explanation' }
    setSelectedLesson(item)
    setProgress(saved)
    setSectionIndex(next.sectionIndex || 0)
    setQuestionIndex(next.questionIndex || 0)
    setStage(next.stage || 'explanation')
    setAnswer(null)
    setChecked(false)
    setFinished(false)
    setActive(true)
    onActiveChange?.(true)
    setShowStartChoice(false)
  }

  const requestStart = item => {
    const saved = readProgress(item.id)
    setSelectedLesson(item)
    setProgress(saved)
    if (saved) setShowStartChoice(true)
    else begin(true, item)
  }

  const stopLesson = () => {
    if (selectedLesson) saveProgress(selectedLesson.id, { sectionIndex, questionIndex, stage, updatedAt: new Date().toISOString() })
    setProgress(selectedLesson ? readProgress(selectedLesson.id) : null)
    setActive(false)
    onActiveChange?.(false)
    setShowStopConfirm(false)
    setAnswer(null)
    setChecked(false)
  }

  const nextQuestion = () => {
    if (!selectedLesson || !section) return
    if (questionIndex + 1 < section.questions.length) {
      setQuestionIndex(value => value + 1)
      setAnswer(null)
      setChecked(false)
      return
    }
    if (sectionIndex + 1 < selectedLesson.sections.length) {
      setSectionIndex(value => value + 1)
      setQuestionIndex(0)
      setStage('explanation')
      setAnswer(null)
      setChecked(false)
      return
    }
    setFinished(true)
    clearProgress(selectedLesson.id)
    setProgress(null)
    onComplete?.(selectedLesson.id)
  }

  const subjectOptions = [...new Set(lessons.map(item => item.subject).filter(Boolean))]
  const topicOptions = [...new Set(lessons.map(item => item.topic).filter(Boolean))]
  const levelOptions = [...new Set(lessons.map(item => item.level).filter(Boolean))]
  const difficultyOptions = [...new Set(lessons.map(item => item.difficulty).filter(Boolean))]
  const visibleLessons = lessons.filter(item => {
    const search = normalizeText(searchTerm)
    const matchesSearch = !search || [item.title, item.subtitle, item.subject, item.topic, item.description].some(value => normalizeText(value).includes(search))
    const matchesSubject = subjectFilter === 'alles' || item.subject === subjectFilter
    const matchesTopic = topicFilter === 'alles' || item.topic === topicFilter
    const matchesLevel = levelFilter === 'alles' || (levelFilter === 'mijn-niveau' ? profileLevelMatch(item, profile) : item.level === levelFilter)
    const matchesStatus = statusFilter === 'alles' || (statusFilter === 'afgerond' ? completedLessons.includes(item.id) : !completedLessons.includes(item.id))
    const matchesDifficulty = difficultyFilter === 'alles' || item.difficulty === difficultyFilter
    const matchesClass = !item.target_class || normalizeText(item.target_class) === normalizeText(profile?.className)
    const matchesSchool = !item.target_school || normalizeText(item.target_school) === normalizeText(profile?.school)
    return matchesSearch && matchesSubject && matchesTopic && matchesLevel && matchesStatus && matchesDifficulty && matchesClass && matchesSchool
  }).sort((a, b) => Number(goalMatch(b, profile)) - Number(goalMatch(a, profile)) || Number(profileLevelMatch(b, profile)) - Number(profileLevelMatch(a, profile)))

  if (finished) return <section className="panel lesson-player lesson-fullscreen"><div className="lesson-complete"><span className="complete-icon"><Check size={38}/></span><h2>Je hebt de les afgerond</h2><p>Je hebt alle onderdelen gelezen en de oefenvragen doorlopen.</p><div className="complete-xp"><Zap size={20}/><strong>{completedLessons.includes(selectedLesson?.id) ? 'Les opnieuw afgerond' : '20 XP verdiend'}</strong></div><button className="primary-btn" onClick={() => { setActive(false); onActiveChange?.(false); setFinished(false); setSelectedLesson(null) }}>Terug naar mijn lessen</button></div></section>

  if (!active) return (
    <div>
      <section className="lesson-intro panel">
        <div><span className="panel-kicker">JOUW LEERPROFIEL</span><h2>Lessen die bij jou passen</h2><p>{profile?.username ? 'Hoi ' + profile.username + ', ontdek lessen die aansluiten op ' + (profile.className || 'jouw klas') + ' en ' + (profile.level || 'jouw niveau') + '.' : 'Bekijk lessen en oefen op je eigen tempo.'}</p>{profile?.goal && <small className="muted">Jouw leerdoel: {profile.goal}</small>}</div>
        <strong><Clock3 size={16}/> Minimaal 10 min per dag</strong>
      </section>
      <section className="lesson-filters panel">
        <div className="lesson-filter-heading"><div><span className="panel-kicker">LESSEN VINDEN</span><strong>Filter je lessen</strong></div><span>{visibleLessons.length} {visibleLessons.length === 1 ? 'les gevonden' : 'lessen gevonden'}</span></div>
        <input className="lesson-filter-search" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Zoek op lestitel of onderwerp..." aria-label="Zoek lessen" />
        <div className="lesson-filter-controls">
          <label>Vak<select value={subjectFilter} onChange={e => setSubjectFilter(e.target.value)}><option value="alles">Alle vakken</option>{subjectOptions.map(value => <option key={value}>{value}</option>)}</select></label>
          <label>Onderwerp<select value={topicFilter} onChange={e => setTopicFilter(e.target.value)}><option value="alles">Alle onderwerpen</option>{topicOptions.map(value => <option key={value}>{value}</option>)}</select></label>
          <label>Niveau<select value={levelFilter} onChange={e => setLevelFilter(e.target.value)}><option value="mijn-niveau">Mijn niveau ({profile?.level || 'niet ingesteld'})</option><option value="alles">Alle niveaus</option>{levelOptions.map(value => <option key={value}>{value}</option>)}</select></label>
          <label>Moeilijkheid<select value={difficultyFilter} onChange={e => setDifficultyFilter(e.target.value)}><option value="alles">Alle moeilijkheden</option>{difficultyOptions.map(value => <option key={value}>{value}</option>)}</select></label>
          <label>Voortgang<select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}><option value="alles">Alle lessen</option><option value="niet-afgerond">Nog te doen</option><option value="afgerond">Afgerond</option></select></label>
        </div>
      </section>
      {catalogLoading && <div className="panel lesson-empty-filter">Lessen laden…</div>}
      {catalogError && <div className="panel lesson-empty-filter">{catalogError}</div>}
      {!catalogLoading && visibleLessons.map(item => {
        const saved = readProgress(item.id)
        const isRecommended = profileLevelMatch(item, profile)
        const questionCount = item.sections.reduce((sum, part) => sum + part.questions.length, 0)
        return <article className="lesson-tile panel" key={item.id}>
          <div className="lesson-tile-top"><span className="lesson-emoji"><Compass size={27}/></span><span className="lesson-number">{item.subject.toUpperCase()} · {item.level.toUpperCase()} · {item.difficulty.toUpperCase()}</span></div>
          <h3>{item.title}</h3><p>{item.subtitle}</p><p className="lesson-preview-copy">{item.intro}</p>
          <div className="lesson-preview-list">{item.sections.map((part, index) => <div className="lesson-preview-row" key={part.title}><span>{index + 1}</span><Compass size={17}/><div><strong>{part.title}</strong><small>Uitleg en {part.questions.length} oefenvraag{part.questions.length === 1 ? '' : 'en'}</small></div><Check size={15}/></div>)}</div>
          <div className="lesson-preview-foot"><span><BookOpen size={15}/> {questionCount} vragen in totaal</span><span><Zap size={15}/> 20 XP na afronding</span></div>
          <div className="lesson-tile-tags"><span>{item.mode === 'minigame' ? 'Minigame' : 'Normale les'}</span>{isRecommended && <span>Past bij jouw niveau</span>}{goalMatch(item, profile) && <span>Sluit aan op je leerdoel</span>}{item.target_class && <span>{item.target_class}</span>}</div>
          {completedLessons.includes(item.id) && <p className="lesson-done-note"><Check size={15}/> Deze les is al afgerond. Je kunt hem opnieuw oefenen.</p>}
          <button className="primary-btn" onClick={() => requestStart(item)}>{saved ? 'Les openen' : completedLessons.includes(item.id) ? 'Opnieuw oefenen' : 'Bekijk de les'} <ArrowRight size={16}/></button>
        </article>
      })}
      {!catalogLoading && !visibleLessons.length && <div className="panel lesson-empty-filter">Geen lessen gevonden die passen bij deze filters en jouw leerprofiel. Pas je filters aan of vraag je docent om een les voor jouw klas of school te maken.</div>}
      {showStartChoice && selectedLesson && <div className="modal-backdrop" role="presentation"><section className="modal lesson-choice-modal" role="dialog" aria-modal="true" aria-labelledby="lesson-choice-title"><button className="modal-close" onClick={() => setShowStartChoice(false)} aria-label="Sluiten"><X size={18}/></button><span className="panel-kicker">OPGESLAGEN VOORTGANG</span><h2 id="lesson-choice-title">Je was al bezig met deze les</h2><p>Je voortgang is bewaard. Wat wil je doen?</p><button className="primary-btn" onClick={() => begin(false, selectedLesson)}><Play size={16}/> Verdergaan</button><button className="google-submit" onClick={() => begin(true, selectedLesson)}><RotateCcw size={16}/> Start opnieuw</button></section></div>}
    </div>
  )

  const Icon = section?.icon || Compass
  const isOpenQuestion = question?.type === 'open'
  const isCorrect = isOpenQuestion ? normalizeText(answer) === normalizeText(question?.answer) : Number(answer) === Number(question?.answer)
  return (
    <section className="panel lesson-player lesson-fullscreen">
      <div className="lesson-player-top"><button className="text-btn" onClick={() => setShowStopConfirm(true)}><ChevronLeft size={15}/> Les stoppen</button><span className="panel-kicker">{selectedLesson?.subject?.toUpperCase()} · ONDERDEEL {sectionIndex + 1} VAN {selectedLesson?.sections?.length}</span></div>
      <div className="lesson-progress"><span style={{ width: percent + '%' }}/></div>
      <div className="lesson-player-meta"><span>{section?.title}</span><span>{completedQuestions} van {totalQuestions} vragen doorlopen</span></div>
      {stage === 'explanation' ? <>
        <div className="lesson-hero"><span><Icon size={34}/></span><div><span className="panel-kicker">EERST BEGRIJPEN</span><h2>{section?.title}</h2></div></div>
        <div className="lesson-explanation"><p>{section?.explanation || 'Bekijk de vragen en oefen met dit onderdeel.'}</p>{section?.example && <div className="lesson-example"><strong>Voorbeeld om te onthouden</strong><p>{section.example}</p></div>}</div>
        <div className="lesson-stage-foot"><span><BookOpen size={15}/> Lees de uitleg rustig door. Je krijgt hierna vragen over dit onderdeel.</span><button className="primary-btn" onClick={() => setStage('questions')}>Ik snap het <ArrowRight size={16}/></button></div>
      </> : <>
        <span className="panel-kicker">OEFENEN · VRAAG {questionIndex + 1} VAN {section?.questions?.length}</span>
        <div className="lesson-question"><h2>{question?.q}</h2>
          {isOpenQuestion ? <textarea rows="3" value={answer ?? ''} disabled={checked} onChange={event => setAnswer(event.target.value)} placeholder="Typ je antwoord..."/> : <div className="lesson-options">{(question?.options || []).map((option, index) => <button key={index} className={answer === index ? 'selected' : ''} disabled={checked} onClick={() => setAnswer(index)}>{option}</button>)}</div>}
          {checked && <div className={'lesson-feedback ' + (isCorrect ? 'correct' : 'incorrect')}><strong>{isCorrect ? 'Goed gedaan' : 'Bekijk het antwoord'}</strong><p>{question?.feedback}</p>{isOpenQuestion && !isCorrect && <p><strong>Antwoord:</strong> {question?.answer}</p>}</div>}
        </div>
        <div className="lesson-question-foot"><span>Onderdeel {sectionIndex + 1} · Vraag {questionIndex + 1}</span>{!checked ? <button className="primary-btn" disabled={answer === null || (isOpenQuestion && !String(answer).trim())} onClick={() => setChecked(true)}>Controleer</button> : <button className="primary-btn" onClick={nextQuestion}>{questionIndex + 1 === section.questions.length ? sectionIndex + 1 === selectedLesson.sections.length ? 'Les afronden' : 'Volgend onderdeel' : 'Volgende vraag'} <ArrowRight size={15}/></button>}</div>
      </>}
      {showStopConfirm && <div className="modal-backdrop" role="presentation"><section className="modal lesson-choice-modal" role="dialog" aria-modal="true" aria-labelledby="stop-lesson-title"><button className="modal-close" onClick={() => setShowStopConfirm(false)} aria-label="Sluiten"><X size={18}/></button><span className="panel-kicker">LES PAUZEREN</span><h2 id="stop-lesson-title">Wil je deze les stoppen?</h2><p>Je voortgang tot hier wordt opgeslagen. De volgende keer kun je verdergaan waar je gebleven was of opnieuw beginnen.</p><button className="primary-btn" onClick={stopLesson}><Save size={16}/> Stoppen en voortgang bewaren</button><button className="google-submit" onClick={() => setShowStopConfirm(false)}>Verder met de les</button></section></div>}
    </section>
  )
}
