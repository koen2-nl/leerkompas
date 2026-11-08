import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, BookOpen, Check, ChevronLeft, CircleHelp, Clock3, Compass, Play, RotateCcw, Save, ShieldAlert, X, Zap } from 'lucide-react'

const lesson = {
  id: 'volcano',
  title: 'Vulkanen en aardbevingen',
  subtitle: 'Wat gebeurt er onder het aardoppervlak?',
  duration: '10–12 min',
  intro: 'Je ontdekt hoe aardplaten bewegen, waarom aardbevingen ontstaan en hoe vulkanen werken. Elk onderdeel begint met uitleg en een voorbeeld. Daarna oefen je meteen met vragen over precies dat onderdeel.',
  sections: [
    {
      title: 'Aardplaten',
      icon: Compass,
      explanation: 'De buitenste laag van de aarde is verdeeld in grote en kleine stukken. Die stukken noemen we aardplaten. Ze sluiten op elkaar aan als een soort puzzel en bewegen heel langzaam, meestal maar enkele centimeters per jaar.',
      example: 'Vergelijk de aardplaten met stukken van een gebarsten eierschaal: ze liggen tegen elkaar, maar kunnen heel langzaam verschuiven.',
      questions: [
        { q: 'Hoe noemen we de grote stukken waaruit de aardkorst bestaat?', options: ['Wolkenlagen', 'Aardplaten', 'Luchtstromen'], answer: 1, feedback: 'De aardkorst bestaat uit aardplaten die heel langzaam bewegen.' },
        { q: 'Hoe snel bewegen aardplaten meestal?', options: ['Enkele centimeters per jaar', 'Enkele kilometers per dag', 'Helemaal niet'], answer: 0, feedback: 'Aardplaten bewegen langzaam: meestal enkele centimeters per jaar.' }
      ]
    },
    {
      title: 'Aardbevingen',
      icon: ActivityIcon,
      explanation: 'Aardplaten kunnen naar elkaar toe bewegen, uit elkaar gaan of langs elkaar schuiven. Soms blijven de randen tijdelijk vastzitten. De spanning bouwt dan op. Wanneer die spanning plotseling vrijkomt, gaat de grond trillen: dat is een aardbeving.',
      example: 'Een aardbeving ontstaat dus door beweging en spanning in de aardkorst, niet door het weer.',
      questions: [
        { q: 'Waardoor ontstaat een aardbeving meestal?', options: ['Door langdurige regen', 'Door de aantrekkingskracht van de maan', 'Door spanning die tussen aardplaten vrijkomt'], answer: 2, feedback: 'Als opgebouwde spanning bij aardplaten plotseling vrijkomt, trilt de grond.' }
      ]
    },
    {
      title: 'Vulkanen',
      icon: BookOpen,
      explanation: 'Diep in de aarde kan gesteente zo heet worden dat het smelt. Dit gesmolten gesteente heet magma. Als magma via een opening naar buiten komt, noemen we het lava. Bij een uitbarsting kunnen ook as en gassen vrijkomen.',
      example: 'Onthoud het verschil: onder de grond heet het magma, aan het aardoppervlak heet het lava.',
      questions: [
        { q: 'Hoe heet gesmolten gesteente onder de grond?', options: ['Lava', 'Magma', 'As'], answer: 1, feedback: 'Onder de grond heet gesmolten gesteente magma. Aan het oppervlak noemen we het lava.' },
        { q: 'Wat kan bij een vulkaanuitbarsting naar buiten komen?', options: ['Lava, as en gassen', 'Alleen water', 'Sneeuw en zand'], answer: 0, feedback: 'Bij een uitbarsting kunnen lava, as en gassen vrijkomen.' }
      ]
    }
  ]
}

function ActivityIcon(props) { return <Zap {...props}/> }
const STORAGE_KEY = 'leerkompas:lesson-progress:' + lesson.id
const readProgress = () => {
  try { const value = localStorage.getItem(STORAGE_KEY); return value ? JSON.parse(value) : null } catch { return null }
}
const saveProgress = value => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
    window.dispatchEvent(new CustomEvent('leerkompas:data-changed'))
  } catch { /* De les blijft in het huidige scherm beschikbaar. */ }
}

export default function GeographyLessons({ completedLessons, onComplete }) {
  const [progress, setProgress] = useState(() => readProgress())
  const [active, setActive] = useState(false)
  const [stage, setStage] = useState('explanation')
  const [sectionIndex, setSectionIndex] = useState(0)
  const [questionIndex, setQuestionIndex] = useState(0)
  const [answer, setAnswer] = useState(null)
  const [checked, setChecked] = useState(false)
  const [showStartChoice, setShowStartChoice] = useState(false)
  const [showStopConfirm, setShowStopConfirm] = useState(false)
  const [finished, setFinished] = useState(false)

  const section = lesson.sections[sectionIndex]
  const question = section?.questions[questionIndex]
  const totalQuestions = useMemo(() => lesson.sections.reduce((sum, item) => sum + item.questions.length, 0), [])
  const completedQuestions = useMemo(() => lesson.sections.slice(0, sectionIndex).reduce((sum, item) => sum + item.questions.length, 0) + (stage === 'questions' ? questionIndex : 0), [sectionIndex, stage, questionIndex])
  const percent = finished ? 100 : Math.round(((completedQuestions + (stage === 'explanation' ? 0 : 0)) / totalQuestions) * 100)

  useEffect(() => {
    if (active && !finished) saveProgress({ sectionIndex, questionIndex, stage, updatedAt: new Date().toISOString() })
  }, [active, finished, sectionIndex, questionIndex, stage])

  const begin = (restart = false) => {
    const next = !restart && progress ? progress : { sectionIndex: 0, questionIndex: 0, stage: 'explanation' }
    setSectionIndex(next.sectionIndex || 0)
    setQuestionIndex(next.questionIndex || 0)
    setStage(next.stage || 'explanation')
    setAnswer(null)
    setChecked(false)
    setFinished(false)
    setActive(true)
    setShowStartChoice(false)
  }

  const requestStart = () => {
    const saved = readProgress()
    setProgress(saved)
    if (saved) setShowStartChoice(true)
    else begin(true)
  }

  const stopLesson = () => {
    saveProgress({ sectionIndex, questionIndex, stage, updatedAt: new Date().toISOString() })
    setProgress(readProgress())
    setActive(false)
    setShowStopConfirm(false)
    setAnswer(null)
    setChecked(false)
  }

  const nextQuestion = () => {
    if (questionIndex + 1 < section.questions.length) {
      setQuestionIndex(value => value + 1)
      setAnswer(null)
      setChecked(false)
      return
    }
    if (sectionIndex + 1 < lesson.sections.length) {
      setSectionIndex(value => value + 1)
      setQuestionIndex(0)
      setStage('explanation')
      setAnswer(null)
      setChecked(false)
      return
    }
    setFinished(true)
    setActive(false)
    localStorage.removeItem(STORAGE_KEY)
    setProgress(null)
    onComplete(lesson.id)
  }

  if (!active) return (
    <div>
      <section className="lesson-intro panel">
        <div><span className="panel-kicker">AARDRIJKSKUNDE · LESOVERZICHT</span><h2>Leer stap voor stap</h2><p>Bekijk eerst wat je gaat leren. Daarna krijg je per onderdeel uitleg en oefenvragen.</p></div>
        <strong><Clock3 size={16}/> {lesson.duration}</strong>
      </section>
      <article className="lesson-tile panel">
        <div className="lesson-tile-top"><span className="lesson-emoji"><Compass size={27}/></span><span className="lesson-number">LESPREVIEW · {lesson.duration.toUpperCase()}</span></div>
        <h3>{lesson.title}</h3>
        <p>{lesson.subtitle}</p>
        <p className="lesson-preview-copy">{lesson.intro}</p>
        <div className="lesson-preview-list">
          {lesson.sections.map((item, index) => {
            const Icon = item.icon
            return <div className="lesson-preview-row" key={item.title}><span>{index + 1}</span><Icon size={17}/><div><strong>{item.title}</strong><small>Uitleg, voorbeeld en {item.questions.length} oefenvraag{item.questions.length > 1 ? 'en' : ''}</small></div><Check size={15}/></div>
          })}
        </div>
        <div className="lesson-preview-foot"><span><BookOpen size={15}/> {totalQuestions} vragen in totaal</span><span><Zap size={15}/> 20 XP na afronding</span></div>
        {completedLessons.includes(lesson.id) && <p className="lesson-done-note"><Check size={15}/> Deze les is al afgerond. Je kunt hem opnieuw oefenen.</p>}
        <button className="primary-btn" onClick={requestStart}>{progress ? 'Les openen' : completedLessons.includes(lesson.id) ? 'Opnieuw oefenen' : 'Bekijk de les'} <ArrowRight size={16}/></button>
      </article>
      {showStartChoice && <div className="modal-backdrop" role="presentation"><section className="modal lesson-choice-modal" role="dialog" aria-modal="true" aria-labelledby="lesson-choice-title"><button className="modal-close" onClick={() => setShowStartChoice(false)} aria-label="Sluiten"><X size={18}/></button><span className="panel-kicker">OPGESLAGEN VOORTGANG</span><h2 id="lesson-choice-title">Je was al bezig met deze les</h2><p>Je voortgang is bewaard. Wat wil je doen?</p><button className="primary-btn" onClick={() => begin(false)}><Play size={16}/> Verdergaan</button><button className="google-submit" onClick={() => begin(true)}><RotateCcw size={16}/> Start opnieuw</button></section></div>}
    </div>
  )

  const Icon = section.icon
  return (
    <section className="panel lesson-player">
      <div className="lesson-player-top"><button className="text-btn" onClick={() => setShowStopConfirm(true)}><ChevronLeft size={15}/> Les stoppen</button><span className="panel-kicker">AARDRIJKSKUNDE · ONDERDEEL {sectionIndex + 1} VAN {lesson.sections.length}</span></div>
      <div className="lesson-progress"><span style={{width: percent + '%'}}/></div>
      <div className="lesson-player-meta"><span>{section.title}</span><span>{completedQuestions} van {totalQuestions} vragen doorlopen</span></div>
      {stage === 'explanation' ? <>
        <div className="lesson-hero"><span><Icon size={34}/></span><div><span className="panel-kicker">EERST BEGRIJPEN</span><h2>{section.title}</h2></div></div>
        <div className="lesson-explanation"><p>{section.explanation}</p><div className="lesson-example"><strong>Voorbeeld om te onthouden</strong><p>{section.example}</p></div></div>
        <div className="lesson-stage-foot"><span><BookOpen size={15}/> Lees de uitleg rustig door. Je krijgt hierna vragen over dit onderdeel.</span><button className="primary-btn" onClick={() => setStage('questions')}>Ik snap het <ArrowRight size={16}/></button></div>
      </> : <>
        <span className="panel-kicker">OEFENEN · VRAAG {questionIndex + 1} VAN {section.questions.length}</span>
        <div className="lesson-question"><h2>{question.q}</h2><div className="lesson-options">{question.options.map((option, index) => <button key={option} className={answer === index ? 'selected' : ''} disabled={checked} onClick={() => setAnswer(index)}>{option}</button>)}</div>
          {checked && <div className={'lesson-feedback ' + (answer === question.answer ? 'correct' : 'incorrect')}><strong>{answer === question.answer ? 'Goed gedaan' : 'Onthoud dit'}</strong><p>{question.feedback}</p></div>}
        </div>
        <div className="lesson-question-foot"><span>Onderdeel {sectionIndex + 1} · Vraag {questionIndex + 1}</span>{!checked ? <button className="primary-btn" disabled={answer === null} onClick={() => setChecked(true)}>Controleer</button> : <button className="primary-btn" onClick={nextQuestion}>{questionIndex + 1 === section.questions.length ? sectionIndex + 1 === lesson.sections.length ? 'Les afronden' : 'Volgend onderdeel' : 'Volgende vraag'} <ArrowRight size={15}/></button>}</div>
      </>}
      {showStopConfirm && <div className="modal-backdrop" role="presentation"><section className="modal lesson-choice-modal" role="dialog" aria-modal="true" aria-labelledby="stop-lesson-title"><button className="modal-close" onClick={() => setShowStopConfirm(false)} aria-label="Sluiten"><X size={18}/></button><span className="panel-kicker">LES PAUZEREN</span><h2 id="stop-lesson-title">Wil je deze les stoppen?</h2><p>Je voortgang tot hier wordt opgeslagen. De volgende keer kun je verdergaan waar je gebleven was of opnieuw beginnen.</p><button className="primary-btn" onClick={stopLesson}><Save size={16}/> Stoppen en voortgang bewaren</button><button className="google-submit" onClick={() => setShowStopConfirm(false)}>Verder met de les</button></section></div>}
      {finished && <div className="lesson-complete"><span className="complete-icon"><Check size={38}/></span><h2>Je hebt de les afgerond</h2><p>Je hebt alle onderdelen gelezen en de oefenvragen doorlopen.</p><div className="complete-xp"><Zap size={20}/><strong>20 XP verdiend</strong></div><button className="primary-btn" onClick={() => setActive(false)}>Terug naar mijn lessen</button></div>}
    </section>
  )
}
