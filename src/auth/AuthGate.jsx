import { useEffect, useMemo, useState } from 'react'
import { AuthContext } from './AuthContext.jsx'
import { GraduationCap } from 'lucide-react'
import App from '../App.jsx'
import SetupWizard from './SetupWizard.jsx'
import PublicSharedLesson from './PublicSharedLesson.jsx'
import { isSupabaseConfigured, supabase } from './supabase.js'

const DATA_KEYS = ['subjects', 'cards', 'known', 'studyStats', 'completedLessons', 'lessonProgress', 'planning', 'dark', 'accent', 'widgets', 'profile', 'vocabularyLists']
const localData = () => Object.fromEntries(DATA_KEYS.map(key => {
  try { const value = localStorage.getItem('leerkompas:' + key); return [key, value ? JSON.parse(value) : null] } catch { return [key, null] }
}))
const writeLocalData = data => DATA_KEYS.forEach(key => {
  if (data?.[key] !== null && data?.[key] !== undefined) localStorage.setItem('leerkompas:' + key, JSON.stringify(data[key]))
})

const profileMetadata = profile => ({
  username: profile.username,
  school: profile.school || '',
  class_name: profile.className,
  level: profile.level,
  goal: profile.goal,
  daily_minutes: Number(profile.dailyMinutes) || 10,
  profile_completed_at: profile.completedAt || new Date().toISOString()
})

const syncProfileMetadata = async profile => {
  const { error } = await supabase.auth.updateUser({ data: profileMetadata(profile) })
  if (error) throw new Error('Je profiel kon niet bij Authentication worden opgeslagen: ' + error.message)
}

export default function AuthGate() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [syncStatus, setSyncStatus] = useState('saved')
  const [syncReady, setSyncReady] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isLessonMaker, setIsLessonMaker] = useState(false)
  const [profileReady, setProfileReady] = useState(false)
  const [profileLoaded, setProfileLoaded] = useState(false)
  useEffect(() => {
    if (!supabase) { setLoading(false); return }
    let alive = true
    supabase.auth.getSession().then(({ data, error }) => {
      if (!alive) return
      if (error) console.error('Sessie ophalen mislukt:', error.message)
      setSession(data?.session ?? null)
      setLoading(false)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (alive) setSession(nextSession)
    })
    return () => { alive = false; listener.subscription.unsubscribe() }
  }, [])
  useEffect(() => {
    if (!session?.user) { setSyncReady(false); setProfileReady(false); setProfileLoaded(false); setIsAdmin(false); setIsLessonMaker(false); return }
    let cancelled = false
    const hydrate = async () => {
      setSyncReady(false); setProfileReady(false); setProfileLoaded(false); setSyncStatus('saving')
      const { data, error } = await supabase.from('user_data').select('data').eq('user_id', session.user.id).maybeSingle()
      if (cancelled) return
      if (error) { setSyncStatus('error'); console.error('Clouddata laden mislukt:', error.message); return }
      if (data?.data) {
        DATA_KEYS.forEach(key => localStorage.removeItem('leerkompas:' + key))
        writeLocalData(data.data)
      } else {
        const initialData = localData()
        const { error: saveError } = await supabase.from('user_data').upsert({ user_id: session.user.id, data: initialData })
        if (saveError) { setSyncStatus('error'); console.error('Lokale leerdata migreren mislukt:', saveError.message); return }
      }
      const { data: profileRow, error: profileError } = await supabase.from('student_profiles').select('*').eq('user_id', session.user.id).maybeSingle()
      if (cancelled) return
      let profileForMetadata = null
      if (profileError) {
        console.error('Profiel laden uit Supabase mislukt:', profileError.message)
      } else if (profileRow) {
        profileForMetadata = {
          username: profileRow.username,
          school: profileRow.school || '',
          className: profileRow.class_name,
          level: profileRow.level,
          goal: profileRow.goal,
          dailyMinutes: profileRow.daily_minutes,
          completedAt: profileRow.completed_at
        }
        localStorage.setItem('leerkompas:profile', JSON.stringify(profileForMetadata))
      } else {
        let legacyProfile = null
        try { legacyProfile = JSON.parse(localStorage.getItem('leerkompas:profile') || 'null') } catch {}
        if (legacyProfile?.username && legacyProfile?.className && legacyProfile?.level && legacyProfile?.goal) {
          const { error: profileSaveError } = await supabase.from('student_profiles').upsert({
            user_id: session.user.id,
            username: legacyProfile.username,
            school: legacyProfile.school || '',
            class_name: legacyProfile.className,
            level: legacyProfile.level,
            goal: legacyProfile.goal,
            daily_minutes: Math.max(10, Number(legacyProfile.dailyMinutes) || 10),
            completed_at: legacyProfile.completedAt || new Date().toISOString()
          })
          if (profileSaveError) console.error('Bestaand profiel migreren mislukt:', profileSaveError.message)
          else profileForMetadata = legacyProfile
        }
      }
      if (profileForMetadata) {
        try { await syncProfileMetadata(profileForMetadata) }
        catch (metadataError) { console.error('Authentication metadata synchroniseren mislukt:', metadataError.message) }
      }
      const { data: roleData } = await supabase.from('user_roles').select('role').eq('user_id', session.user.id).maybeSingle()
      if (cancelled) return
      setIsAdmin(roleData?.role === 'admin')
      setIsLessonMaker(roleData?.role === 'lesson_maker')
      if (!cancelled) { setSyncStatus('saved'); setSyncReady(true) }
    }
    hydrate()
    return () => { cancelled = true }
  }, [session?.user?.id])
  useEffect(() => {
    if (!syncReady || !session?.user) return
    let timer
    const save = () => {
      window.clearTimeout(timer)
      setSyncStatus('saving')
      timer = window.setTimeout(async () => {
        const { error } = await supabase.from('user_data').upsert({ user_id: session.user.id, data: localData() })
        setSyncStatus(error ? 'error' : 'saved')
        if (error) console.error('Synchroniseren mislukt:', error.message)
      }, 450)
    }
    window.addEventListener('leerkompas:data-changed', save)
    return () => { window.clearTimeout(timer); window.removeEventListener('leerkompas:data-changed', save) }
  }, [syncReady, session?.user?.id])
  useEffect(() => {
    if (!syncReady || !session?.user) return
    try { setProfileReady(!!JSON.parse(localStorage.getItem('leerkompas:profile') || 'null')) } catch { setProfileReady(false) } finally { setProfileLoaded(true) }
  }, [syncReady, session?.user?.id])
  const value = useMemo(() => ({ user: session?.user ?? null, syncStatus, isAdmin, isLessonMaker, signOut: async () => {
    DATA_KEYS.forEach(key => localStorage.removeItem('leerkompas:' + key))
    await supabase.auth.signOut()
  } }), [session, syncStatus, isAdmin, isLessonMaker])
  if (loading) return <div className="auth-screen"><div className="auth-card">Leervo laden…</div></div>
  if (!isSupabaseConfigured) return <div className="auth-screen"><div className="auth-card auth-setup"><div className="auth-brand"><span className="auth-brand-mark"><GraduationCap/></span><span>Slim<span style={{color:'#7664db'}}>Leren</span></span></div><h1>Bijna klaar voor jouw leerplek</h1><p>De accountfunctie is voorbereid. Vul eerst de Supabase-omgevingsvariabelen in om registratie en inloggen te activeren.</p><p><strong>Benodigd:</strong> <code>VITE_SUPABASE_URL</code> en <code>VITE_SUPABASE_ANON_KEY</code>. Volg de installatiehandleiding in <code>docs/PROJECT.md</code>.</p></div></div>
  const sharedToken = new URLSearchParams(window.location.search).get('share')
  if (!session && sharedToken) return <PublicSharedLesson token={sharedToken}/>
  if (!session) return <AuthScreen />
  if (!syncReady) return <div className="auth-screen"><div className="auth-card">Je persoonlijke leerplek veilig laden…</div></div>
  if (!profileLoaded) return <div className="auth-screen"><div className="auth-card">Je profiel laden…</div></div>
  if (!profileReady) return <SetupWizard onComplete={async profile => {
    const { error } = await supabase.from('student_profiles').upsert({
      user_id: session.user.id,
      username: profile.username,
      school: profile.school || '',
      class_name: profile.className,
      level: profile.level,
      goal: profile.goal,
      daily_minutes: profile.dailyMinutes,
      completed_at: profile.completedAt
    })
    if (error) throw new Error('Je profiel kon niet worden opgeslagen: ' + error.message)
    await syncProfileMetadata(profile)
    localStorage.setItem('leerkompas:profile', JSON.stringify(profile))
    window.dispatchEvent(new CustomEvent('leerkompas:data-changed'))
    setProfileReady(true)
  }} />
  return <AuthContext.Provider value={value}><App /></AuthContext.Provider>
}

function AuthScreen() {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const submit = async event => {
    event.preventDefault(); setBusy(true); setError(''); setMessage('')
    const result = mode === 'signup'
      ? await supabase.auth.signUp({ email: email.trim(), password })
      : await supabase.auth.signInWithPassword({ email: email.trim(), password })
    setBusy(false)
    if (result.error) setError(result.error.message)
    else if (mode === 'signup' && !result.data.session) setMessage('Controleer je e-mail om je account te bevestigen. Daarna kun je inloggen.')
    else setMessage(mode === 'signup' ? 'Je account is aangemaakt.' : 'Je bent ingelogd.')
  }
  const google = async () => {
    setBusy(true); setError('')
    const { error: oauthError } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })
    if (oauthError) { setError(oauthError.message); setBusy(false) }
  }
  return <main className="auth-screen"><section className="auth-card"><div className="auth-brand"><span className="auth-brand-mark"><GraduationCap/></span><span>Slim<span style={{color:'#7664db'}}>Leren</span></span></div><h1>{mode === 'login' ? 'Welkom terug!' : 'Maak je leeraccount'}</h1><p>{mode === 'login' ? 'Log in en ga verder waar je gebleven was.' : 'Maak gratis een account om je leerstof overal te bewaren.'}</p><div className="auth-tabs"><button className={mode === 'login' ? 'active' : ''} onClick={() => {setMode('login');setError('');setMessage('')}}>Inloggen</button><button className={mode === 'signup' ? 'active' : ''} onClick={() => {setMode('signup');setError('');setMessage('')}}>Account maken</button></div><form onSubmit={submit}><label className="auth-field">E-mailadres<input type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="jij@voorbeeld.nl"/></label><label className="auth-field">Wachtwoord<input type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength={8} required value={password} onChange={e=>setPassword(e.target.value)} placeholder="Minimaal 8 tekens"/></label><button className="auth-submit" disabled={busy}>{busy ? 'Even wachten…' : mode === 'login' ? 'Inloggen' : 'Gratis account maken'}</button></form><div className="auth-divider">of</div><button className="google-submit" disabled={busy} onClick={google}>G  Doorgaan met Google</button>{error&&<div className="auth-error" role="alert">{error}</div>}{message&&<div className="auth-success" role="status">{message}</div>}<p className="auth-footnote">Door verder te gaan gebruik je je eigen persoonlijke leeromgeving. Je wachtwoord wordt beheerd door Supabase en niet door Leervo.</p></section></main>
}
