import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight, Brain, Check, Clock3, Grid3X3, Lightbulb, RotateCcw, Sparkles, Trophy } from 'lucide-react'
import './focus-break.css'

const DAILY_WORDS = [
  'appel', 'stoel', 'regen', 'vogel', 'water', 'brood', 'droom', 'plant',
  'trein', 'nacht', 'leven', 'kamer', 'toren', 'feest', 'kunst', 'ritme',
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
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Amsterdam', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(date)
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]))
  return [values.year, values.month, values.day].join('-')
}

const DUTCH_GUESS_WORDS = new Set([
  ...DAILY_WORDS,
  ...(`aarde adres apart appel arena armen avond azuur bakje basis basta bedroeg bekers beter bever bezig bijna blijk bloem bocht bodem bonus boven brand breed brief broer bruin buurt chaos claim clowns cruise dames dagen dalen daken delen denkt derde dicht diens dieren dient diner dozen draad draai droom droog drukt duurt duren dwars echtel effect eigen elders email enige ervan eten? extra feiten feest fiets flinke focus fonds fruit gaten geven geval geluid gezet gloed goden groen groep grote groter haren harde heeft horen hoger hoofd hopen hotel huidig huren ieder ideaal indruk inzet isjes jaren juist kabel kamer kanto kennis keuze klaar klant klein kleur klima kroon kunst langs later leven licht liever lopen lucht maart malen meisje melk metert middel minus modder mooie morgen motor muren nacht nadat namen nodig nodig noord nooit noten ouder paard paars partij pasta pelen plein plots poort prins prima radio ramen regen reeks recht reden regel reisje rijden ritme rivier robot ronde rozen ruste samen schaal scherp schip schuld sinds slaan slaap smaak snelst smaak somen sport steen stilte stoel storm straat strook stuk? sturen tafel talen tempo terug thuis toets tonen toren totaal trein trend trouw twaalf tussen vader vaker vallen valse varen vasten vecht veelal vader vaker veilig veiling velds verve? video vierde vlakke vlammen vlees vogel volgen vooral vorme vraagt vrede vroeg vrucht water wegen welke wereld weten wezen witte willen wijze woord werken weten zomer zonnig zorgen zwaar zwart zweer`.split(/\s+/).filter(word => word.length === 5 && /^[a-z]+$/.test(word))
])

function emptySudokuNotes() {
  return Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => []))
}

function loadSudokuProgress(storageKey) {
  const fresh = {
    values: SUDOKU_PUZZLE.map(row => row.split('').map(value => value === '0' ? '' : value)),
    notes: emptySudokuNotes(),
    finished: false,
    selected: { row: 0, column: 2 },
    hintsUsed: 0,
    showErrors: false
  }
  try {
    const saved = JSON.parse(window.localStorage.getItem(storageKey) || 'null')
    if (!saved || !Array.isArray(saved.values) || saved.values.length !== 9 ||
        saved.values.some(row => !Array.isArray(row) || row.length !== 9)) return fresh
    return {
      ...fresh,
      values: saved.values.map(row => row.map(value => String(value || '').replace(/[^1-9]/g, '').slice(-1))),
      notes: Array.isArray(saved.notes) && saved.notes.length === 9 ? saved.notes : fresh.notes,
      finished: Boolean(saved.finished),
      selected: saved.selected || fresh.selected,
      hintsUsed: Math.max(0, Number(saved.hintsUsed) || 0),
      showErrors: Boolean(saved.showErrors)
    }
  } catch {
    return fresh
  }
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
  const sudokuStorageKey = 'leerkompas:sudoku-progress:' + (userId || 'guest')
  const initialSudokuProgress = loadSudokuProgress(sudokuStorageKey)
  const [selectedGame, setSelectedGame] = useState(null)
  const [dailyState, setDailyState] = useState(() => loadDailyProgress(storageKey))
  const [wordInput, setWordInput] = useState('')
  const [wordMessage, setWordMessage] = useState('')
  const [showCompletion, setShowCompletion] = useState(false)
  const [completion, setCompletion] = useState({ title: '', message: '' })
  const [sudokuValues, setSudokuValues] = useState(() => initialSudokuProgress.values)
  const [sudokuNotes, setSudokuNotes] = useState(() => initialSudokuProgress.notes)
  const [selectedSudokuCell, setSelectedSudokuCell] = useState(() => initialSudokuProgress.selected)
  const [sudokuHintsUsed, setSudokuHintsUsed] = useState(() => initialSudokuProgress.hintsUsed)
  const [showSudokuErrors, setShowSudokuErrors] = useState(() => initialSudokuProgress.showErrors)
  const [notesMode, setNotesMode] = useState(false)
  const [sudokuMessage, setSudokuMessage] = useState('')
  const [sudokuFinished, setSudokuFinished] = useState(() => initialSudokuProgress.finished)
  const [pauseMinutes, setPauseMinutes] = useState(5)
  const [timerEndsAt, setTimerEndsAt] = useState(null)
  const [timerRemaining, setTimerRemaining] = useState(0)
  const [timerDone, setTimerDone] = useState(false)

  useEffect(() => {
    try { window.localStorage.setItem(storageKey, JSON.stringify(dailyState)) } catch { /* De puzzel blijft speelbaar zonder opslag. */ }
  }, [dailyState, storageKey])

  useEffect(() => {
    try {
      window.localStorage.setItem(sudokuStorageKey, JSON.stringify({
        values: sudokuValues, notes: sudokuNotes, selected: selectedSudokuCell,
        hintsUsed: sudokuHintsUsed, showErrors: showSudokuErrors, finished: sudokuFinished
      }))
    } catch { /* De sudoku blijft speelbaar als lokale opslag niet beschikbaar is. */ }
  }, [sudokuStorageKey, sudokuValues, sudokuNotes, selectedSudokuCell, sudokuHintsUsed, showSudokuErrors, sudokuFinished])

  useEffect(() => {
    if (!timerEndsAt) return
    const updateRemaining = () => {
      const remaining = Math.max(0, Math.ceil((timerEndsAt - Date.now()) / 1000))
      setTimerRemaining(remaining)
      if (remaining === 0) {
        setTimerEndsAt(null)
        setTimerDone(true)
      }
    }
    updateRemaining()
    const interval = window.setInterval(updateRemaining, 1000)
    return () => window.clearInterval(interval)
  }, [timerEndsAt])

  useEffect(() => {
    const updateDailyPuzzle = () => setDailyState(current => current.date === localDateKey() ? current : loadDailyProgress(storageKey))
    window.addEventListener('focus', updateDailyPuzzle)
    const interval = window.setInterval(updateDailyPuzzle, 60000)
    return () => {
      window.removeEventListener('focus', updateDailyPuzzle)
      window.clearInterval(interval)
    }
  }, [storageKey])

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
    setSudokuNotes(emptySudokuNotes())
    setSelectedSudokuCell({ row: 0, column: 2 })
    setSudokuHintsUsed(0)
    setShowSudokuErrors(false)
    setNotesMode(false)
    setSudokuMessage('')
    setSudokuFinished(false)
  }
  const updateSudokuCell = (rowIndex, columnIndex, value) => {
    if (SUDOKU_PUZZLE[rowIndex][columnIndex] !== '0' || sudokuFinished) return
    const next = sudokuValues.map(row => [...row])
    next[rowIndex][columnIndex] = value.replace(/[^1-9]/g, '').slice(-1)
    setSelectedSudokuCell({ row: rowIndex, column: columnIndex })
    setSudokuValues(next)
    setSudokuMessage('')
  }
  const enterSudokuDigit = digit => {
    const { row, column } = selectedSudokuCell
    if (sudokuFinished || SUDOKU_PUZZLE[row][column] !== '0') return
    if (notesMode) {
      setSudokuNotes(previous => {
        const next = previous.map(line => line.map(cell => [...cell]))
        const current = next[row][column]
        next[row][column] = current.includes(Number(digit))
          ? current.filter(value => value !== Number(digit))
          : [...current, Number(digit)].sort((a, b) => a - b)
        return next
      })
    } else {
      const next = sudokuValues.map(line => [...line])
      next[row][column] = digit
      setSudokuValues(next)
      setSudokuNotes(previous => previous.map((line, r) => line.map((cell, c) => r === row && c === column ? [] : cell)))
    }
    setSudokuMessage('')
  }
  const clearSudokuCell = () => {
    const { row, column } = selectedSudokuCell
    if (sudokuFinished || SUDOKU_PUZZLE[row][column] !== '0') return
    const next = sudokuValues.map(line => [...line])
    next[row][column] = ''
    setSudokuValues(next)
    setSudokuNotes(previous => previous.map((line, r) => line.map((cell, c) => r === row && c === column ? [] : cell)))
    setSudokuMessage('')
  }
  const giveSudokuHint = () => {
    if (sudokuFinished) return
    for (let row = 0; row < 9; row++) {
      for (let column = 0; column < 9; column++) {
        if (SUDOKU_PUZZLE[row][column] === '0' && sudokuValues[row][column] !== SUDOKU_SOLUTION[row][column]) {
          const next = sudokuValues.map(line => [...line])
          next[row][column] = SUDOKU_SOLUTION[row][column]
          setSudokuValues(next)
          setSudokuNotes(previous => previous.map((line, r) => line.map((cell, c) => r === row && c === column ? [] : cell)))
          setSelectedSudokuCell({ row, column })
          setSudokuHintsUsed(count => count + 1)
          setSudokuMessage('Hint gebruikt: één vakje is ingevuld.')
          return
        }
      }
    }
    setSudokuMessage('Er is geen leeg vakje meer voor een hint.')
  }
  const sudokuErrorCount = sudokuValues.reduce((total, row, rowIndex) =>
    total + row.reduce((rowTotal, value, columnIndex) =>
      rowTotal + (value && value !== SUDOKU_SOLUTION[rowIndex][columnIndex] ? 1 : 0), 0), 0)
  const startPauseTimer = () => {
    setTimerDone(false)
    setTimerEndsAt(Date.now() + pauseMinutes * 60000)
  }
  const stopPauseTimer = () => {
    setTimerEndsAt(null)
    setTimerRemaining(0)
    setTimerDone(false)
  }
  const formatTimer = seconds => String(Math.floor(seconds / 60)).padStart(2, '0') + ':' + String(seconds % 60).padStart(2, '0')
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
  const submitWord = () => {
    if (dailyState.finished) return
    const guess = wordInput.toLowerCase().replace(/[^a-z]/g, '')
    if (guess.length !== 5) {
      setWordMessage('Vul precies vijf letters in.')
      return
    }
    if (!DUTCH_GUESS_WORDS.has(guess)) {
      setWordMessage('Dat woord staat niet in de Nederlandse woordenlijst. Probeer een ander woord.')
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
  const pressWordKey = key => {
    if (dailyState.finished) return
    if (key === 'ENTER') { submitWord(); return }
    if (key === '⌫') { setWordInput(value => value.slice(0, -1)); setWordMessage(''); return }
    if (/^[A-Z]$/.test(key) && wordInput.length < 5) {
      setWordInput(value => value + key.toLowerCase())
      setWordMessage('')
    }
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
      <section className="fb-pause-timer" aria-label="Pauzetimer">
        <div><span className="fb-kicker"><Clock3 size={14}/> PAUZETIMER</span><p>{timerEndsAt ? 'Je pauzetijd loopt.' : timerDone ? 'Je pauzetijd is voorbij. Ga rustig verder wanneer je er klaar voor bent.' : 'Kies een rustige duur voor je pauze.'}</p></div>
        {timerEndsAt ? <div className="fb-timer-controls"><strong role="timer" aria-live="off">{formatTimer(timerRemaining)}</strong><button type="button" className="fb-timer-stop" onClick={stopPauseTimer}>Stop timer</button></div> : <div className="fb-timer-controls"><select aria-label="Duur van de pauze" value={pauseMinutes} onChange={event => setPauseMinutes(Number(event.target.value))}><option value={5}>5 minuten</option><option value={10}>10 minuten</option><option value={15}>15 minuten</option></select><button type="button" className="fb-timer-start" onClick={startPauseTimer}>Start timer</button></div>}
      </section>
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
        {!dailyState.finished ? <><form className="fb-word-form" onSubmit={event => { event.preventDefault(); submitWord() }}>
          <label htmlFor="fb-word-input">Jouw gok</label>
          <div><input id="fb-word-input" value={wordInput} onChange={event => setWordInput(event.target.value.replace(/[^a-zA-Z]/g, '').slice(0, 5))} maxLength={5} autoComplete="off" autoCapitalize="none" placeholder="Vijf letters" aria-describedby="fb-word-message"/><button type="submit" disabled={wordInput.length !== 5}>Controleer <ArrowRight size={16}/></button></div>
          <p id="fb-word-message" role="status">{wordMessage || (6 - dailyState.guesses.length) + ' pogingen over.'}</p>
        </form><div className="fb-word-keyboard" role="group" aria-label="Toetsenbord voor het woordspel">
          {'QWERTYUIOPASDFGHJKLZXCVBNM'.split('').map(letter=><button type="button" key={letter} onClick={()=>pressWordKey(letter)}>{letter}</button>)}
          <button type="button" className="fb-key-wide" onClick={()=>pressWordKey('⌫')} aria-label="Laatste letter verwijderen">⌫</button>
          <button type="button" className="fb-key-wide" onClick={()=>pressWordKey('ENTER')}>Enter</button>
        </div></> : <div className="fb-finished-note"><Check size={17}/><span>{dailyState.won ? 'Je hebt de puzzel van vandaag opgelost.' : 'De puzzel van vandaag is afgerond.'} Morgen is er een nieuw woord.</span></div>}
      </section>}
      {selectedGame === 'sudoku' && <section className="fb-game-panel">
        <div className="fb-game-heading"><div><span className="fb-kicker">LOGICA · OP JE EIGEN TEMPO</span><h2>Sudoku</h2><p>Vul de lege vakjes met cijfers van 1 tot en met 9.</p></div><button className="fb-reset-button" onClick={resetSudoku}><RotateCcw size={15}/> Opnieuw</button></div>
        <div className="fb-sudoku-board-wrap">
          <div className="fb-sudoku-board" role="group" aria-label="Sudoku raster">
            {sudokuValues.map((row, rowIndex) => <div className="fb-sudoku-row" key={rowIndex}>{row.map((value, columnIndex) => {
              const fixed = SUDOKU_PUZZLE[rowIndex][columnIndex] !== '0'
              const selected = selectedSudokuCell.row === rowIndex && selectedSudokuCell.column === columnIndex
              const errorsVisible = showSudokuErrors && value && value !== SUDOKU_SOLUTION[rowIndex][columnIndex]
              const extraClass = (columnIndex === 2 || columnIndex === 5 ? ' fb-box-right' : '') + (rowIndex === 2 || rowIndex === 5 ? ' fb-box-bottom' : '') + (selected ? ' fb-selected' : '') + (errorsVisible ? ' fb-error' : '')
              return <div key={columnIndex} className="fb-sudoku-cell-wrap"><input className={'fb-sudoku-cell' + (fixed ? ' fb-given' : '') + extraClass} value={value} disabled={fixed || sudokuFinished} inputMode="numeric" maxLength={1} aria-label={'Rij ' + (rowIndex + 1) + ', kolom ' + (columnIndex + 1) + (errorsVisible ? ', mogelijk fout' : '')} onFocus={() => setSelectedSudokuCell({ row: rowIndex, column: columnIndex })} onChange={event => updateSudokuCell(rowIndex, columnIndex, event.target.value)}/>{sudokuNotes[rowIndex][columnIndex].length>0 && <small className="fb-sudoku-notes">{sudokuNotes[rowIndex][columnIndex].join(' ')}</small>}</div>
            })}</div>)}
          </div>
        </div>
        <div className="fb-sudoku-controls">
          <button type="button" className={notesMode?'is-active':''} aria-pressed={notesMode} disabled={sudokuFinished} onClick={()=>setNotesMode(value=>!value)}>Notities {notesMode?'aan':'uit'}</button>
          <button type="button" disabled={sudokuFinished} onClick={giveSudokuHint}>Hint gebruiken</button>
          <button type="button" className={showSudokuErrors?'is-active':''} aria-pressed={showSudokuErrors} onClick={()=>setShowSudokuErrors(value=>!value)}>Foutmarkering {showSudokuErrors?'aan':'uit'}</button>
        </div>
        <div className="fb-sudoku-keypad" role="group" aria-label={notesMode?'Kies een notitie voor het geselecteerde vakje':'Cijferkeuze voor het geselecteerde sudoku-vakje'}>
          {[1,2,3,4,5,6,7,8,9].map(digit=><button type="button" key={digit} disabled={sudokuFinished} onClick={()=>enterSudokuDigit(String(digit))}>{digit}</button>)}
          <button type="button" className="fb-sudoku-clear" disabled={sudokuFinished} aria-label="Wis het geselecteerde vakje" onClick={clearSudokuCell}>⌫</button>
        </div>
        <div className="fb-sudoku-actions"><p role="status">{sudokuMessage || (showSudokuErrors ? sudokuErrorCount + ' mogelijke fouten gemarkeerd. ' : '') + 'Elk cijfer mag per rij, kolom en 3 × 3-blok maar één keer voorkomen.' + (sudokuHintsUsed ? ' Hints gebruikt: ' + sudokuHintsUsed + '.' : '')}</p><button onClick={checkSudoku} disabled={sudokuFinished}>Controleer sudoku <Check size={16}/></button></div>
      </section>}
      {selectedGame === 'memory' && <MemoryBoard onComplete={() => finish('Alle paren gevonden!', 'Je hebt alle zes paren gevonden. Goed gespeeld!')}/>}
      {timerEndsAt && <div className="fb-timer-live" role="status">Pauzetijd over: {formatTimer(timerRemaining)}</div>}
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
