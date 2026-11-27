import { useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, BookOpen, Check, ChevronLeft, ChevronRight, RotateCcw, Target } from 'lucide-react'
import './flashcard-session.css'

const STORAGE_KEY = 'leerkompas:flashcard-review'
const BOX_INTERVALS = [1, 3, 7]

function todayInAmsterdam() {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Amsterdam' }).format(new Date())
}

function addDays(dateKey, days) {
  const [year, month, day] = dateKey.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day + days))
  return date.toISOString().slice(0, 10)
}

function cardKey(card) {
  return [card.subject || '', card.q || ''].join('::')
}

function readReviewProgress() {
  try {
    const saved = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}')
    return saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : {}
  } catch {
    return {}
  }
}

function getDueIndices(cards, progress, today) {
  return cards
    .map((card, index) => ({ card, index }))
    .filter(({ card }) => !progress[cardKey(card)] || !progress[cardKey(card)].dueDate || progress[cardKey(card)].dueDate <= today)
    .map(item => item.index)
}

export default function FlashcardSession({ cards = [], onAddCard, onBack, onProgress }) {
  const today = todayInAmsterdam()
  const [reviewProgress, setReviewProgress] = useState(readReviewProgress)
  const initialQueue = useMemo(() => getDueIndices(cards, readReviewProgress(), today), [])
  const [queue, setQueue] = useState(initialQueue)
  const [position, setPosition] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [ratings, setRatings] = useState({})
  const [showResult, setShowResult] = useState(false)

  const currentIndex = queue[position]
  const current = cards[currentIndex]
  const ratedCount = queue.filter(index => Object.prototype.hasOwnProperty.call(ratings, cardKey(cards[index]))).length
  const knownCount = queue.filter(index => ratings[cardKey(cards[index])] === true).length
  const missedIndices = queue.filter(index => ratings[cardKey(cards[index])] === false)
  const progressPercent = queue.length ? Math.round((ratedCount / queue.length) * 100) : 0
  const boxCounts = [1, 2, 3].map(box => cards.filter(card => (reviewProgress[cardKey(card)]?.box || 0) === box).length)
  const dueCount = getDueIndices(cards, reviewProgress, today).length

  const persistProgress = next => {
    setReviewProgress(next)
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch { /* Herhalen blijft werken als lokale opslag niet beschikbaar is. */ }
  }

  const startSession = indices => {
    setQueue(indices)
    setPosition(0)
    setFlipped(false)
    setRatings({})
    setShowResult(false)
  }

  const rateCard = knewIt => {
    if (!current) return
    const key = cardKey(current)
    const previous = reviewProgress[key] || { box: 0 }
    const nextBox = knewIt ? Math.min(3, (previous.box || 0) + 1) : 1
    const dueDate = knewIt ? addDays(today, BOX_INTERVALS[nextBox - 1]) : today
    persistProgress({
      ...reviewProgress,
      [key]: { box: nextBox, dueDate, lastReviewed: today }
    })
    const nextRatings = { ...ratings, [key]: knewIt }
    setRatings(nextRatings)
    setFlipped(false)
    const nextUnrated = queue.findIndex(index => !Object.prototype.hasOwnProperty.call(nextRatings, cardKey(cards[index])))
    if (nextUnrated === -1) setShowResult(true)
    else setPosition(nextUnrated)
  }

  const movePosition = direction => {
    if (!queue.length) return
    setPosition(value => Math.max(0, Math.min(queue.length - 1, value + direction)))
    setFlipped(false)
  }

  if (!cards.length) {
    return <section className="panel flashcard-empty">
      <BookOpen size={24}/>
      <h2>Je hebt nog geen flashcards</h2>
      <p>Maak eerst een paar kaarten bij je lessen. Daarna kun je ze hier op vaste momenten herhalen.</p>
      <div><button className="primary-btn" onClick={onAddCard}>Eerste flashcard maken <ArrowRight size={16}/></button><button className="soft-btn" onClick={onBack}>Terug naar lessen</button></div>
    </section>
  }

  if (!queue.length && !showResult) {
    return <section className="panel flashcard-empty">
      <div className="flashcard-empty-icon"><Check size={23}/></div>
      <span className="panel-kicker">ALLES BIJGEWERKT</span>
      <h2>Je kaarten zijn bijgewerkt voor vandaag.</h2>
      <p>Je hoeft nu niets meer te herhalen. Je kunt later terugkomen of alle kaarten nog eens rustig doornemen.</p>
      <div><button className="primary-btn" onClick={() => startSession(cards.map((_, index) => index))}>Alle kaarten herhalen <RotateCcw size={16}/></button><button className="soft-btn" onClick={onBack}>Terug naar lessen</button></div>
    </section>
  }

  return <section className="flashcard-session">
    <div className="flashcard-session-toolbar">
      <button className="flashcard-back" onClick={onBack}><ChevronLeft size={16}/> Terug naar lessen</button>
      <span className="flashcard-due-count"><Target size={14}/> {dueCount} {dueCount === 1 ? 'kaart klaar' : 'kaarten klaar'} om te herhalen</span>
    </div>
    <div className="flashcard-session-layout">
      <section className="panel flashcard-session-main">
        <div className="flashcard-session-heading">
          <div><span className="panel-kicker">HERHAALMOMENT</span><h2>{current?.subject || 'Jouw flashcards'}</h2></div>
          <span className="flashcard-session-count">{ratedCount} / {queue.length}</span>
        </div>
        <div className="flashcard-session-progress" role="progressbar" aria-label="Voortgang van je herhaalsessie" aria-valuemin="0" aria-valuemax={queue.length} aria-valuenow={ratedCount}><span style={{ width: progressPercent + '%' }}/></div>
        <div className="flashcard-session-card-controls">
          <button type="button" className="flashcard-arrow" onClick={() => movePosition(-1)} disabled={position === 0} aria-label="Vorige flashcard"><ChevronLeft size={18}/></button>
          <button
            type="button"
            className={'flashcard-session-card' + (flipped ? ' is-flipped' : '')}
            onClick={() => setFlipped(value => !value)}
            onKeyDown={event => {
              if (event.key === 'ArrowLeft') { event.preventDefault(); movePosition(-1) }
              if (event.key === 'ArrowRight') { event.preventDefault(); movePosition(1) }
            }}
            aria-label={flipped ? 'Antwoord getoond. Druk op Enter of spatie om de vraag te zien.' : 'Vraag. Druk op Enter of spatie om het antwoord te tonen. Gebruik de pijltjestoetsen om tussen kaarten te bewegen.'}
          >
            <span className="flashcard-session-side">{flipped ? 'ANTWOORD' : 'VRAAG'} · {flipped ? 'KLIK OM TERUG TE DRAAIEN' : 'KLIK OF DRUK OP ENTER OM TE DRAAIEN'}</span>
            <strong>{flipped ? current?.a : current?.q}</strong>
            <span className="flashcard-session-hint">{flipped ? 'Hoe goed wist je dit?' : 'Neem even de tijd om het antwoord te bedenken.'}</span>
          </button>
          <button type="button" className="flashcard-arrow" onClick={() => movePosition(1)} disabled={position === queue.length - 1} aria-label="Volgende flashcard"><ChevronRight size={18}/></button>
        </div>
        <div className="flashcard-rating-actions">
          <button type="button" className="flashcard-rating-missed" disabled={!flipped} onClick={() => rateCard(false)}>Nog oefenen <RotateCcw size={16}/></button>
          <button type="button" className="flashcard-rating-known" disabled={!flipped} onClick={() => rateCard(true)}><Check size={16}/> Ik wist het al</button>
        </div>
        <p className="flashcard-session-keyboard">Tip: Enter of spatie draait de kaart om. Gebruik ← en → om te bladeren.</p>
      </section>
      <aside className="panel flashcard-session-side">
        <span className="panel-kicker">JOUW HERHAALVAKKEN</span>
        <h3>In kleine stappen onthouden</h3>
        <p>Kaarten die je goed kent komen later terug. Kaarten die lastig zijn, oefen je vaker.</p>
        <div className="flashcard-box-list">
          {boxCounts.map((count, index) => <div key={index}><span className={'flashcard-box-marker box-' + (index + 1)}>{index + 1}</span><div><strong>Vak {index + 1}</strong><small>{index === 0 ? 'Vaker oefenen' : index === 1 ? 'Goed op weg' : 'Gaat al goed'}</small></div><b>{count}</b></div>)}
        </div>
        <div className="flashcard-session-counts"><div><strong>{knownCount}</strong><span>Goed gekend</span></div><div><strong>{missedIndices.length}</strong><span>Nog oefenen</span></div></div>
      </aside>
    </div>
    {showResult && <div className="flashcard-result-backdrop"><section className="flashcard-result-modal" role="dialog" aria-modal="true" aria-labelledby="flashcard-result-title">
      <span className="flashcard-result-icon"><Check size={24}/></span>
      <span className="panel-kicker">HERHAALMOMENT AFGEROND</span>
      <h2 id="flashcard-result-title">Goed gewerkt!</h2>
      <p>Je hebt {queue.length} {queue.length === 1 ? 'kaart' : 'kaarten'} bekeken. {knownCount} {knownCount === 1 ? 'kaart kende' : 'kaarten kende'} je al goed{missedIndices.length ? ' en ' + missedIndices.length + ' ' + (missedIndices.length === 1 ? 'kaart vraagt' : 'kaarten vragen') + ' nog wat aandacht.' : '.'}</p>
      <div className="flashcard-result-actions">
        <button className="flashcard-result-primary" onClick={() => startSession(missedIndices.length ? missedIndices : cards.map((_, index) => index))}>{missedIndices.length ? 'Moeilijke kaarten herhalen' : 'Nog een keer oefenen'}</button>
        <button className="flashcard-result-secondary" onClick={onProgress}>Naar voortgang</button>
      </div>
    </section></div>}
  </section>
}
