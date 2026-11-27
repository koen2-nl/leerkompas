import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight, Brain, Check, Clock3, Grid3X3, Lightbulb, RotateCcw, Sparkles, Trophy } from 'lucide-react'
import './focus-break.css'

const DAILY_WORDS = [
  'appel', 'stoel', 'regen', 'vogel', 'water', 'brood', 'droom', 'plant',
  'trein', 'nacht', 'leven', 'kamer', 'toren', 'feest', 'kunst', 'ritme',
  'zomer', 'lente', 'groen', 'bloem', 'sport', 'licht', 'samen',
]
const VALID_WORDS = new Set([
  ...DAILY_WORDS,
  'aarde','avond','baard','basis','beeld','beest','begin','beter','beurt','breed','brein','bruin','buren',
  'dames','dicht','diner','draad','eerst','eigen','einde','fabel','fiets','flink','geven','gezin','gloed',
  'glans','grens','groot','haast','harde','haren','hoger','hotel','ieder','inzet','jacht','juist','kaars',
  'kaart','kader','kassa','keren','keuze','klant','klein','koken','korte','kruid','kruis','lagen','lange',
  'leest','lepel','leren','lopen','lucht','macht','maand','markt','media','meest','meter','model','moest',
  'motor','naald','naast','namen','negen','niets','nieuw','nooit','noord','noten','omdat','onder','onzin',
  'opzet','paard','paden','pakte','palen','panda','pasta','peper','peren','plank','plein','ploeg','poort',
  'poten','prima','proef','radio','recht','reden','regel','reeks','reken','robot','roest','route','ruzie',
  'schaal','schep','schip','slaan','smaak','snaar','snoep','speld','spier','spoor','staan','steek','steil',
  'sterk','stoep','storm','stuur','tafel','taken','talen','teams','tempo','thema','tocht','toets','tonen',
  'trots','varen','vaten','volop','vraag','vrede','vrees','vuren','wagen','wacht','weken','weten','wezen',
  'wilde','winst','wonen','woord','zagen','zaken','zalen','zegen','zeven','zonde','zowel'
])

const SUDOKU_PUZZLE = [
  '530070000', '600195000', '098000060',
  '800060003', '400803001', '700020006',
  '060000280', '000419005', '000080079',
]
const SUDOKU_SOLUTION = [
  '534678912', '672195348', '198342567',
  '859761423', '426853791', '713924856',
  '961537284', '287419635', '345286179',
]

const MEMORY_PAIRS = [
  { id: 'leaf', symbol: '🍃', label: 'Blad' },
  { id: 'moon', symbol: '🌙', label: 'Maan' },
  { id: 'planet', symbol: '🪐', label: 'Planeet' },
  { id: 'mushroom', symbol: '🍄', label: 'Paddenstoel' },
  { id: 'shell', symbol: '🐚', label: 'Schelp' },
  { id: 'cloud', symbol: '☁️', label: 'Wolk' },
]

function localDateKey(date = new Date()) {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Amsterdam' }).format(date)
}

function dailyWordFor(dateKey) {
  const [year, month, day] = dateKey.split('-').map(Number)
  const dayNumber = Math.floor(Date.UTC(year, month - 1, day) / 86400000)
  return DAILY_WORDS[((dayNumber % DAILY_WORDS.length) + DAILY_WORDS.length) % DAILY_WORDS.length]
}

function loadDailyProgress(storageKey) {
  const today = localDateKey()
  try {
    const saved = JSON.parse(window.localStorage.getItem(storageKey) || 'null')
    if (saved?.date === today && Array.isArray(saved.guesses)) return saved
  } catch { /* Een beschadigde lokale opslag begint met een schone dag. */ }
  return { date: today, guesses: [], finished: false, won: false }
}

function readSudokuProgress(storageKey) {
  const emptyValues = SUDOKU_PUZZLE.map(row => row.split('').map(value => value === '0' ? '' : value))
  try {
    const saved = JSON.parse(window.localStorage.getItem(storageKey) || 'null')
    const validValues = Array.isArray(saved?.values) && saved.values.length === 9 && saved.values.every(row => Array.isArray(row) && row.length === 9)
    return {
      values: validValues ? saved.values : emptyValues,
      notes: saved?.notes && typeof saved.notes === 'object' ? saved.notes : {},
      finished: Boolean(saved?.finished)
    }
  } catch {
    return { values: emptyValues, notes: {}, finished: false }
  }
}

function evaluateGuess(guess, target) {
  const result = Array(5).fill('absent')
  const remaining = {}
  for (const letter of target) remaining[letter] = (remaining[letter] || 0) + 1
  for (let index = 0; index < 5; index++) {
    if (guess[index] === target[index]) {
      result[index] = 'correct'
      remaining[guess[index]]--
    }
  }
  for (let index = 0; index < 5; index++) {
    const letter = guess[index]
    if (result[index] === 'absent' && remaining[letter] > 0) {
      result[index] = 'present'
      remaining[letter]--
    }
  }
  return result
}

function createMemoryDeck() {
  return [...MEMORY_PAIRS, ...MEMORY_PAIRS]
    .map((card, index) => ({ ...card, cardId: index + '-' + card.id }))
    .sort(() => Math.random() - 0.5)
}

export default function FocusBreak({ onContinueLearning, userId }) {
  const storageKey = 'leerkompas:daily-word:' + (userId || 'guest')
  const sudokuStorageKey = 'leerkompas:sudoku-progress:' + (userId || 'guest')
  const [selectedGame, setSelectedGame] = useState(null)
  const [timerEndAt, setTimerEndAt] = useState(null)
  const [timerRemaining, setTimerRemaining] = useState(0)
  const [timerMessage, setTimerMessage] = useState('')
  const [dailyState, setDailyState] = useState(() => loadDailyProgress(storageKey))
  const [wordInput, setWordInput] = useState('')
  const [wordMessage, setWordMessage] = useState('')
  const [showCompletion, setShowCompletion] = useState(false)
  const [completion, setCompletion] = useState({ title: '', message: '' })
  const [initialSudoku] = useState(() => readSudokuProgress(sudokuStorageKey))
  const [sudokuValues, setSudokuValues] = useState(() => initialSudoku.values)
  const [sudokuNotes, setSudokuNotes] = useState(() => initialSudoku.notes)
  const [selectedSudokuCell, setSelectedSudokuCell] = useState([0, 2])
  const [sudokuNotesMode, setSudokuNotesMode] = useState(false)
  const [showSudokuErrors, setShowSudokuErrors] = useState(true)
  const [sudokuMessage, setSudokuMessage] = useState('')
  const [sudokuFinished, setSudokuFinished] = useState(initialSudoku.finished)

  useEffect(() => {
    try { window.localStorage.setItem(storageKey, JSON.stringify(dailyState)) } catch { /* De puzzel blijft speelbaar zonder opslag. */ }
  }, [dailyState, storageKey])
  useEffect(() => {
    try { window.localStorage.setItem(sudokuStorageKey, JSON.stringify({ values: sudokuValues, notes: sudokuNotes, finished: sudokuFinished })) } catch { /* De sudoku blijft speelbaar zonder opslag. */ }
  }, [sudokuValues, sudokuNotes, sudokuFinished, sudokuStorageKey])
  useEffect(() => {
    if (!timerEndAt) { setTimerRemaining(0); return }
    const updateTimer = () => {
      const remaining = Math.max(0, Math.ceil((timerEndAt - Date.now()) / 1000))
      setTimerRemaining(remaining)
      if (remaining === 0) {
        setTimerEndAt(null)
        setTimerMessage('Je pauze is klaar. Neem rustig de tijd om weer verder te gaan.')
      }
    }
    updateTimer()
    const interval = window.setInterval(updateTimer, 1000)
    return () => window.clearInterval(interval)
  }, [timerEndAt])

  const startPauseTimer = minutes => {
    setTimerMessage('')
    setTimerEndAt(Date.now() + minutes * 60 * 1000)
  }
  const stopPauseTimer = () => {
    setTimerEndAt(null)
    setTimerRemaining(0)
    setTimerMessage('De pauzetimer is gestopt.')
  }
  const timerLabel = String(Math.floor(timerRemaining / 60)).padStart(2, '0') + ':' + String(timerRemaining % 60).padStart(2, '0')

  const targetWord = dailyWordFor(dailyState.date)
  const guessStatuses = dailyState.guesses.map(guess => evaluateGuess(guess, targetWord))
  const openGame = game => {
    setShowCompletion(false)
    setSelectedGame(game)
    setWordMessage('')
    setWordInput('')
  }
  const finish = (title, message) => {
    setCompletion({ title, message })
    setShowCompletion(true)
  }
  const resetSudoku = () => {
    setSudokuValues(SUDOKU_PUZZLE.map(row => row.split('').map(value => value === '0' ? '' : value)))
    setSudokuNotes({})
    setSelectedSudokuCell([0, 2])
    setSudokuNotesMode(false)
    setSudokuMessage('')
    setSudokuFinished(false)
  }
  const updateSudokuCell = (rowIndex, columnIndex, value) => {
    const next = sudokuValues.map(row => [...row])
    next[rowIndex][columnIndex] = value.replace(/[^1-9]/g, '').slice(-1)
    setSudokuValues(next)
    if (value) setSudokuNotes(notes => { const updated = { ...notes }; delete updated[rowIndex + '-' + columnIndex]; return updated })
    setSelectedSudokuCell([rowIndex, columnIndex])
    setSudokuMessage('')
  }
  const handleSudokuDigit = digit => {
    const [rowIndex, columnIndex] = selectedSudokuCell
    if (SUDOKU_PUZZLE[rowIndex][columnIndex] !== '0' || sudokuFinished) return
    const key = rowIndex + '-' + columnIndex
    if (sudokuNotesMode && digit) {
      setSudokuNotes(notes => {
        const current = notes[key] || ''
        const next = current.includes(digit) ? current.replace(digit, '') : [...current, digit].sort().join('')
        return { ...notes, [key]: next }
      })
      return
    }
    if (digit === '') {
      updateSudokuCell(rowIndex, columnIndex, '')
      return
    }
    updateSudokuCell(rowIndex, columnIndex, digit)
  }
  const revealSudokuHint = () => {
    if (sudokuFinished) return
    const [selectedRow, selectedColumn] = selectedSudokuCell
    const candidates = [[selectedRow, selectedColumn]]
    for (let row = 0; row < 9; row++) for (let column = 0; column < 9; column++) {
      if (row !== selectedRow || column !== selectedColumn) candidates.push([row, column])
    }
    const target = candidates.find(([row, column]) => SUDOKU_PUZZLE[row][column] === '0' && sudokuValues[row][column] !== SUDOKU_SOLUTION[row][column])
    if (!target) { setSudokuMessage('Er staat geen leeg of fout vakje meer open voor een hint.'); return }
    const [rowIndex, columnIndex] = target
    const next = sudokuValues.map(row => [...row])
    next[rowIndex][columnIndex] = SUDOKU_SOLUTION[rowIndex][columnIndex]
    setSudokuValues(next)
    setSelectedSudokuCell([rowIndex, columnIndex])
    setSudokuMessage('Hint ingevuld bij rij ' + (rowIndex + 1) + ', kolom ' + (columnIndex + 1) + '.')
    const solved = next.every((row, r) => row.every((value, c) => value === SUDOKU_SOLUTION[r][c]))
    if (solved) {
      setSudokuFinished(true)
      finish('Sudoku opgelost!', 'Je hebt de hele puzzel goed ingevuld.')
    }
  }
  const checkSudoku = () => {
    const allFilled = sudokuValues.every(row => row.every(value => value !== ''))
    if (!allFilled) {
      setSudokuMessage('Vul eerst alle lege vakjes in.')
      return
    }
    const solved = sudokuValues.every((row, rowIndex) => row.every((value, columnIndex) => value === SUDOKU_SOLUTION[rowIndex][columnIndex]))
    if (!solved) {
      setSudokuMessage('Er staan nog een paar cijfers verkeerd. Probeer het nog eens.')
      return
    }
    setSudokuFinished(true)
    setSudokuMessage('')
    finish('Sudoku opgelost!', 'Netjes gedaan. Je hebt de hele puzzel goed ingevuld.')
  }
  const submitWord = event => {
    event.preventDefault()
    if (dailyState.finished) return
    const guess = wordInput.toLowerCase().replace(/[^a-z]/g, '')
    if (guess.length !== 5) {
      setWordMessage('Vul precies vijf letters in.')
      return
    }
    if (!VALID_WORDS.has(guess)) {
      setWordMessage('Dit woord staat niet in de Nederlandse woordenlijst. Probeer een ander vijfletterwoord.')
      return
    }
    const nextGuesses = [...dailyState.guesses, guess]
    const won = guess === targetWord
    const finished = won || nextGuesses.length >= 6
    setDailyState({ ...dailyState, guesses: nextGuesses, finished, won })
    setWordInput('')
    setWordMessage('')
    if (finished) finish(won ? 'Goed geraden!' : 'Puzzel afgerond', won
      ? 'Je hebt het woord van vandaag gevonden. Morgen staat er een nieuwe klaar.'
      : 'Het woord van vandaag was ' + targetWord.toUpperCase() + '. Morgen kun je een nieuwe proberen.')
  }

  return <section className="focus-break">
    <div className="fb-pause-timer" aria-label="Pauzetimer">
      <div className="fb-pause-timer-copy">
        <span className="fb-kicker"><Clock3 size={13}/> PAUZETIMER</span>
        <strong>{timerEndAt ? timerLabel : 'Kies een rustige pauze'}</strong>
      </div>
      {timerEndAt ? <button type="button" className="fb-timer-stop" onClick={stopPauseTimer}>Stop timer</button> : <div className="fb-timer-choices">{[5, 10, 15].map(minutes => <button type="button" key={minutes} onClick={() => startPauseTimer(minutes)}>{minutes} min</button>)}</div>}
      {timerMessage && <p role="status" aria-live="polite">{timerMessage}</p>}
    </div>
    {!selectedGame ? <>
      <div className="fb-intro">
        <div>
          <span className="fb-kicker"><Sparkles size={14}/> KORTE FOCUSPAUZE</span>
          <h2>Even opladen, zonder je focus kwijt te raken.</h2>
          <p>Kies een rustige puzzel van een paar minuten. Daarna kun je zo weer verder met leren.</p>
        </div>
        <div className="fb-time-pill"><Clock3 size={17}/> 2–5 minuten per spel</div>
      </div>
      <div className="fb-game-grid">
        <button className="fb-game-card" onClick={() => openGame('word')}>
          <div className="fb-game-art fb-word-art"><span>W</span><span>O</span><span>O</span><span>R</span><span>D</span></div>
          <div className="fb-card-meta"><span>DAGELIJKSE PUZZEL</span><span className={dailyState.finished ? 'fb-status-done' : 'fb-status'}>{dailyState.finished ? 'Klaar voor vandaag' : '1 per dag'}</span></div>
          <h3>Woord van de dag</h3>
          <p>Raad het woord in maximaal zes pogingen. Iedere dag een nieuwe uitdaging.</p>
          <span className="fb-play-link">{dailyState.finished ? 'Bekijk resultaat' : 'Speel de puzzel'} <ArrowRight size={16}/></span>
        </button>
        <button className="fb-game-card" onClick={() => openGame('sudoku')}>
          <div className="fb-game-art fb-sudoku-art"><Grid3X3 size={48} strokeWidth={1.35}/><span>9 × 9</span></div>
          <div className="fb-card-meta"><span>LOGICA</span><span className="fb-status">Op je eigen tempo</span></div>
          <h3>Sudoku</h3>
          <p>Vul het raster in. Elk cijfer komt één keer voor per rij, kolom en blok.</p>
          <span className="fb-play-link">Start sudoku <ArrowRight size={16}/></span>
        </button>
        <button className="fb-game-card" onClick={() => openGame('memory')}>
          <div className="fb-game-art fb-memory-art"><span>✦</span><span>✦</span><span>✦</span><span>✦</span></div>
          <div className="fb-card-meta"><span>GEHEUGEN</span><span className="fb-status">Korte ronde</span></div>
          <h3>Memory</h3>
          <p>Zoek de zes paren. Een klein spelletje om je aandacht even te verzetten.</p>
          <span className="fb-play-link">Start memory <ArrowRight size={16}/></span>
        </button>
      </div>
      <div className="fb-footer-note"><Lightbulb size={17}/><p><strong>Een kleine pauze is genoeg.</strong> Je hoeft niet lang weg te blijven om daarna weer met frisse aandacht verder te gaan.</p></div>
    </> : <>
      <button className="fb-back-button" onClick={() => setSelectedGame(null)}><ArrowLeft size={16}/> Terug naar alle spelletjes</button>
      {selectedGame === 'word' && <section className="fb-game-panel">
        <div className="fb-game-heading"><div><span className="fb-kicker">DAGELIJKSE PUZZEL · 1 PER DAG</span><h2>Woord van de dag</h2><p>Raad het Nederlandse woord van vijf letters in zes pogingen.</p></div><span className="fb-mini-tag"><Clock3 size={14}/> Nieuwe puzzel morgen</span></div>
        <div className="fb-word-board" aria-label="Pogingen voor het woord van de dag">
          {Array.from({ length: 6 }, (_, rowIndex) => {
            const guess = dailyState.guesses[rowIndex] || ''
            const statuses = guessStatuses[rowIndex] || []
            return <div className="fb-word-row" key={rowIndex}>{Array.from({ length: 5 }, (_, columnIndex) => <span key={columnIndex} className={'fb-word-tile ' + (statuses[columnIndex] || (guess[columnIndex] ? 'fb-filled' : ''))}>{guess[columnIndex]?.toUpperCase() || ''}</span>)}</div>
          })}
        </div>
        <div className="fb-word-legend"><span><i className="fb-legend-correct"/> Goede plek</span><span><i className="fb-legend-present"/> Wel in het woord</span><span><i className="fb-legend-absent"/> Niet in het woord</span></div>
        {!dailyState.finished ? <form className="fb-word-form" onSubmit={submitWord}>
          <label htmlFor="fb-word-input">Jouw gok</label>
          <div><input id="fb-word-input" value={wordInput} onChange={event => setWordInput(event.target.value.replace(/[^a-zA-Z]/g, '').slice(0, 5))} maxLength={5} autoComplete="off" autoCapitalize="none" placeholder="Vijf letters" aria-describedby="fb-word-message"/><button type="submit" disabled={wordInput.length !== 5}>Controleer <ArrowRight size={16}/></button></div>
          <p id="fb-word-message" role="status">{wordMessage || (6 - dailyState.guesses.length) + ' pogingen over.'}</p>
        </form> : <div className="fb-finished-note"><Check size={17}/><span>{dailyState.won ? 'Je hebt de puzzel van vandaag opgelost.' : 'De puzzel van vandaag is afgerond.'} Morgen is er een nieuw woord.</span></div>}
      </section>}
      {selectedGame === 'sudoku' && <section className="fb-game-panel">
        <div className="fb-game-heading"><div><span className="fb-kicker">LOGICA · OP JE EIGEN TEMPO</span><h2>Sudoku</h2><p>Vul de lege vakjes met cijfers van 1 tot en met 9.</p></div><button className="fb-reset-button" onClick={resetSudoku}><RotateCcw size={15}/> Opnieuw</button></div>
        <div className="fb-sudoku-board" role="grid" aria-label="Sudoku raster">
          {sudokuValues.map((row, rowIndex) => <div className="fb-sudoku-row" role="row" key={rowIndex}>{row.map((value, columnIndex) => {
            const fixed = SUDOKU_PUZZLE[rowIndex][columnIndex] !== '0'
            const cellKey = rowIndex + '-' + columnIndex
            const incorrect = showSudokuErrors && Boolean(value) && value !== SUDOKU_SOLUTION[rowIndex][columnIndex]
            const selected = selectedSudokuCell[0] === rowIndex && selectedSudokuCell[1] === columnIndex
            const extraClass = (columnIndex === 2 || columnIndex === 5 ? ' fb-box-right' : '') + (rowIndex === 2 || rowIndex === 5 ? ' fb-box-bottom' : '')
            return <div key={columnIndex} className={'fb-sudoku-cell-wrap' + (selected ? ' is-selected' : '') + extraClass}>
              <input className={'fb-sudoku-cell' + (fixed ? ' fb-given' : '') + (incorrect ? ' fb-has-error' : '')} value={value} disabled={fixed || sudokuFinished} inputMode="none" autoComplete="off" maxLength={1} aria-label={'Rij ' + (rowIndex + 1) + ', kolom ' + (columnIndex + 1) + (incorrect ? ', fout ingevuld' : '')} aria-invalid={Boolean(incorrect)} onFocus={() => setSelectedSudokuCell([rowIndex, columnIndex])} onClick={() => setSelectedSudokuCell([rowIndex, columnIndex])} onChange={event => updateSudokuCell(rowIndex, columnIndex, event.target.value)}/>
              {sudokuNotes[cellKey] && !value && <small className="fb-sudoku-notes" aria-label={'Notities ' + sudokuNotes[cellKey].split('').join(', ')}>{sudokuNotes[cellKey].split('').join(' ')}</small>}
              {incorrect && <span className="fb-sudoku-error-mark" aria-label="Fout ingevuld">!</span>}
            </div>
          })}</div>)}
        </div>
        <div className="fb-sudoku-tools">
          <div className="fb-sudoku-mode-buttons">
            <button type="button" className={sudokuNotesMode ? 'is-active' : ''} aria-pressed={sudokuNotesMode} onClick={() => setSudokuNotesMode(value => !value)}>Notities {sudokuNotesMode ? 'aan' : 'uit'}</button>
            <button type="button" aria-pressed={showSudokuErrors} onClick={() => setShowSudokuErrors(value => !value)}>Fouten {showSudokuErrors ? 'tonen' : 'verbergen'}</button>
            <button type="button" onClick={revealSudokuHint}><Lightbulb size={14}/> Hint</button>
          </div>
          <div className="fb-sudoku-keypad" aria-label="Cijferknoppen">
            {Array.from({ length: 9 }, (_, index) => <button type="button" key={index + 1} disabled={sudokuFinished} onClick={() => handleSudokuDigit(String(index + 1))}>{index + 1}</button>)}
            <button type="button" className="fb-sudoku-clear" disabled={sudokuFinished} onClick={() => handleSudokuDigit('')}>Wis</button>
          </div>
          <p className="fb-sudoku-selected">Geselecteerd: rij {selectedSudokuCell[0] + 1}, kolom {selectedSudokuCell[1] + 1}. {sudokuNotesMode ? 'Kies cijfers om notities toe te voegen.' : 'Kies een cijfer om het vakje in te vullen.'}</p>
        </div>
        <div className="fb-sudoku-actions"><p role="status" aria-live="polite">{sudokuMessage || 'Elk cijfer mag per rij, kolom en 3 × 3-blok maar één keer voorkomen.'}</p><button type="button" onClick={checkSudoku} disabled={sudokuFinished}>Controleer sudoku <Check size={16}/></button></div>
      </section>}
      {selectedGame === 'memory' && <MemoryBoard onComplete={() => finish('Alle paren gevonden!', 'Je hebt alle zes paren gevonden. Goed gespeeld!')}/>}
    </>}
    {showCompletion && <div className="fb-result-backdrop"><section className="fb-result-modal" role="dialog" aria-modal="true" aria-labelledby="fb-result-title">
      <div className="fb-result-icon"><Trophy size={25}/></div>
      <span className="fb-kicker">MOOI GEDAAN</span>
      <h2 id="fb-result-title">{completion.title}</h2>
      <p>{completion.message}</p>
      <div className="fb-result-actions"><button className="fb-learn-button" onClick={onContinueLearning}>Verder leren</button><button className="fb-play-button" onClick={() => { setShowCompletion(false); setSelectedGame(null) }}>Verder spelen</button></div>
    </section></div>}
  </section>
}

function MemoryBoard({ onComplete }) {
  const [deck, setDeck] = useState(createMemoryDeck)
  const [flipped, setFlipped] = useState([])
  const [matched, setMatched] = useState([])
  const [moves, setMoves] = useState(0)

  useEffect(() => {
    if (flipped.length !== 2) return
    const first = deck[flipped[0]]
    const second = deck[flipped[1]]
    if (first.id === second.id) {
      setMatched(current => current.includes(first.id) ? current : [...current, first.id])
    }
    const timeout = window.setTimeout(() => setFlipped([]), first.id === second.id ? 300 : 850)
    return () => window.clearTimeout(timeout)
  }, [flipped, deck])

  useEffect(() => {
    if (matched.length === MEMORY_PAIRS.length) onComplete()
  }, [matched.length])

  const flipCard = index => {
    if (flipped.length >= 2 || matched.includes(deck[index].id) || flipped.includes(index)) return
    setFlipped(current => [...current, index])
    if (flipped.length === 1) setMoves(count => count + 1)
  }

  return <section className="fb-game-panel">
    <div className="fb-game-heading"><div><span className="fb-kicker">GEHEUGEN · KORTE RONDE</span><h2>Memory</h2><p>Vind alle zes paren door twee kaarten tegelijk om te draaien.</p></div><span className="fb-mini-tag">{matched.length} / {MEMORY_PAIRS.length} paren</span></div>
    <div className="fb-memory-stats"><span><strong>{moves}</strong> beurten</span><span><strong>{matched.length}</strong> van 6 paren</span><button className="fb-reset-button" onClick={() => { setDeck(createMemoryDeck()); setFlipped([]); setMatched([]); setMoves(0) }}><RotateCcw size={15}/> Opnieuw</button></div>
    <div className="fb-memory-grid">{deck.map((card, index) => {
      const revealed = flipped.includes(index) || matched.includes(card.id)
      return <button key={card.cardId} className={'fb-memory-card' + (revealed ? ' is-revealed' : '') + (matched.includes(card.id) ? ' is-matched' : '')} onClick={() => flipCard(index)} aria-label={revealed ? card.label : 'Kaart omdraaien'}>
        {revealed ? <><strong>{card.symbol}</strong><small>{card.label}</small></> : <span>?</span>}
      </button>
    })}</div>
  </section>
}
