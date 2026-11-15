import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight, Brain, Check, Clock3, Grid3X3, Lightbulb, RotateCcw, Sparkles, Trophy } from 'lucide-react'
import './focus-break.css'

const DAILY_WORDS = [
  'appel', 'stoel', 'regen', 'vogel', 'water', 'brood', 'droom', 'plant',
  'trein', 'nacht', 'leven', 'kamer', 'toren', 'feest', 'kunst', 'muziek',
  'zomer', 'lente', 'groen', 'bloem', 'sport', 'licht', 'samen',
]

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
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-')
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
  const [selectedGame, setSelectedGame] = useState(null)
  const [dailyState, setDailyState] = useState(() => loadDailyProgress(storageKey))
  const [wordInput, setWordInput] = useState('')
  const [wordMessage, setWordMessage] = useState('')
  const [showCompletion, setShowCompletion] = useState(false)
  const [completion, setCompletion] = useState({ title: '', message: '' })
  const [sudokuValues, setSudokuValues] = useState(() => SUDOKU_PUZZLE.map(row => row.split('').map(value => value === '0' ? '' : value)))
  const [sudokuMessage, setSudokuMessage] = useState('')
  const [sudokuFinished, setSudokuFinished] = useState(false)

  useEffect(() => {
    try { window.localStorage.setItem(storageKey, JSON.stringify(dailyState)) } catch { /* De puzzel blijft speelbaar zonder opslag. */ }
  }, [dailyState, storageKey])

  const targetWord = dailyWordFor(dailyState.date)
  const guessStatuses = dailyState.guesses.map(guess => evaluateGuess(guess, targetWord))
  const openGame = game => {
    setShowCompletion(false)
    if (game === 'sudoku' && sudokuFinished) resetSudoku()
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
    setSudokuMessage('')
    setSudokuFinished(false)
  }
  const updateSudokuCell = (rowIndex, columnIndex, value) => {
    const next = sudokuValues.map(row => [...row])
    next[rowIndex][columnIndex] = value.replace(/[^1-9]/g, '').slice(-1)
    setSudokuValues(next)
    setSudokuMessage('')
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
        <div className="fb-sudoku-board" role="group" aria-label="Sudoku raster">
          {sudokuValues.map((row, rowIndex) => <div className="fb-sudoku-row" key={rowIndex}>{row.map((value, columnIndex) => {
            const fixed = SUDOKU_PUZZLE[rowIndex][columnIndex] !== '0'
            const extraClass = (columnIndex === 2 || columnIndex === 5 ? ' fb-box-right' : '') + (rowIndex === 2 || rowIndex === 5 ? ' fb-box-bottom' : '')
            return <input key={columnIndex} className={'fb-sudoku-cell' + (fixed ? ' fb-given' : '') + extraClass} value={value} disabled={fixed || sudokuFinished} inputMode="numeric" maxLength={1} aria-label={'Rij ' + (rowIndex + 1) + ', kolom ' + (columnIndex + 1)} onChange={event => updateSudokuCell(rowIndex, columnIndex, event.target.value)}/>
          })}</div>)}
        </div>
        <div className="fb-sudoku-actions"><p role="status">{sudokuMessage || 'Elk cijfer mag per rij, kolom en 3 × 3-blok maar één keer voorkomen.'}</p><button onClick={checkSudoku} disabled={sudokuFinished}>Controleer sudoku <Check size={16}/></button></div>
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
