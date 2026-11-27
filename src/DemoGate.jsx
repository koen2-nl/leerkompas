import { AuthContext } from './auth/AuthContext.jsx'
import App from './App.jsx'

function localDayOffset(offset = 0) {
  const date = new Date()
  date.setDate(date.getDate() + offset)
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-')
}

function seedReviewData() {
  const sampleSessions = [-6, -5, -3, -2, -1, 0].map((offset, index) => {
    const date = new Date()
    date.setDate(date.getDate() + offset)
    date.setHours(16 + (index % 2), 10, 0, 0)
    return { at: date.toISOString(), duration: 25 + index * 5 }
  })
  const demoData = {
    profile: { username: 'Sam', school: 'Demo Lyceum', className: '3 havo', level: 'havo', goal: 'Met meer rust leren en mijn toetsen goed voorbereiden', dailyMinutes: 35, completedAt: new Date().toISOString() },
    subjects: [
      { name: 'Rekenen', detail: 'Vergelijkingen en verhoudingen', progress: 72, color: 'blue', icon: 'book', due: 3 },
      { name: 'Natuur & techniek', detail: 'Krachten en energie', progress: 54, color: 'green', icon: 'globe', due: 2 },
      { name: 'Engels', detail: 'Vocabulary & grammar', progress: 86, color: 'purple', icon: 'book', due: 1 },
      { name: 'Frans', detail: 'Woordenschat en zinnen', progress: 42, color: 'orange', icon: 'book', due: 4 }
    ],
    cards: [
      { q: 'Wat is een lineaire vergelijking?', a: 'Een vergelijking waarin de variabele alleen tot de eerste macht voorkomt.', subject: 'Rekenen' },
      { q: 'Wat is de eenheid van kracht?', a: 'Newton (N).', subject: 'Natuur & techniek' },
      { q: 'What is the past tense of “to bring”?', a: 'Brought.', subject: 'Engels' },
      { q: 'Wat betekent “bonjour”?', a: 'Goedendag of hallo.', subject: 'Frans' },
      { q: 'Hoe bereken je de gemiddelde snelheid?', a: 'Afstand gedeeld door tijd.', subject: 'Natuur & techniek' },
      { q: 'Wat is een synoniem?', a: 'Een woord met (ongeveer) dezelfde betekenis als een ander woord.', subject: 'Engels' }
    ],
    known: [],
    studyStats: { xp: 260, cardsLearned: 13, sessions: sampleSessions },
    completedLessons: ['basisvergelijkingen', 'snelheid-en-afstand'],
    planning: [
      { id: 'demo-1', title: 'Hoofdstuk 4 herhalen', subject: 'Rekenen', kind: 'Leermoment', date: localDayOffset(0), time: '16:30', minutes: 30, done: false },
      { id: 'demo-2', title: 'Woordjes oefenen', subject: 'Frans', kind: 'Opdracht', date: localDayOffset(1), time: '17:00', minutes: 20, done: false },
      { id: 'demo-3', title: 'Toets krachten en energie', subject: 'Natuur & techniek', kind: 'Toets', date: localDayOffset(3), time: '09:00', minutes: 45, done: false }
    ],
    widgets: ['focus', 'subjects', 'week'],
    themeMode: 'light',
    dark: false,
    accent: 'green'
  }
  try {
    for (const [key, value] of Object.entries(demoData)) {
      const storageKey = 'leerkompas:' + key
      if (localStorage.getItem(storageKey) === null) localStorage.setItem(storageKey, JSON.stringify(value))
    }
  } catch {
    // De demo werkt ook zonder lokale opslag; de voorbeelddata is dan tijdelijk.
  }
}

seedReviewData()

export default function DemoGate() {
  const demoAuth = {
    user: { email: 'demo@leervo.test' },
    signOut: async () => {},
    syncStatus: 'saved',
    isAdmin: false,
    isLessonMaker: false
  }
  return <AuthContext.Provider value={demoAuth}>
    <div className="review-demo-badge" aria-label="Demonstratieomgeving zonder account">DEMO · ZONDER INLOGGEN</div>
    <App />
  </AuthContext.Provider>
}
