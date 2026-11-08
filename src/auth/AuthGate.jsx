import { useEffect, useMemo, useState } from 'react'
import { AuthContext } from './AuthContext.jsx'
import { GraduationCap } from 'lucide-react'
import App from '../App.jsx'
import { isSupabaseConfigured, supabase } from './supabase.js'

const DATA_KEYS = ['subjects', 'cards', 'known', 'studyStats', 'completedLessons', 'lessonProgress', 'dark', 'accent', 'widgets']
const localData = () => Object.fromEntries(DATA_KEYS.map(key => {
  try { const value = localStorage.getItem('leerkompas:' + key); return [key, value ? JSON.parse(value) : null] } catch { return [key, null] }
}))
const writeLocalData = data => DATA_KEYS.forEach(key => {
  if (data?.[key] !== null && data?.[key] !== undefined) localStorage.setItem('leerkompas:' + key, JSON.stringify(data[key]))
})

export default function AuthGate() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [syncStatus, setSyncStatus] = useState('saved')
  const [syncReady, setSyncReady] = useState(false)
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
    if (!session?.user) { setSyncReady(false); return }
    let cancelled = false
    const hydrate = async () => {
      setSyncStatus('saving')
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
  const value = useMemo(() => ({ user: session?.user ?? null, syncStatus, signOut: async () => {
    DATA_KEYS.forEach(key => localStorage.removeItem('leerkompas:' + key))
    await supabase.auth.signOut()
  } }), [session, syncStatus])
  if (loading) return <div className="auth-screen"><div className="auth-card">LeerKompas laden…</div></div>
  if (!isSupabaseConfigured) return <div className="auth-screen"><div className="auth-card auth-setup"><div className="auth-brand"><span className="auth-brand-mark"><GraduationCap/></span>leer<span style={{color:'#7664db'}}>kompas</span></div><h1>Bijna klaar voor jouw leerplek</h1><p>De accountfunctie is voorbereid. Vul eerst de Supabase-omgevingsvariabelen in om registratie en inloggen te activeren.</p><p><strong>Benodigd:</strong> <code>VITE_SUPABASE_URL</code> en <code>VITE_SUPABASE_ANON_KEY</code>. Volg de installatiehandleiding in <code>docs/PROJECT.md</code>.</p></div></div>
  if (!session) return <AuthScreen />
  if (!syncReady) return <div className="auth-screen"><div className="auth-card">Je persoonlijke leerplek veilig laden…</div></div>
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
  return <main className="auth-screen"><section className="auth-card"><div className="auth-brand"><span className="auth-brand-mark"><GraduationCap/></span><span>leer<span style={{color:'#7664db'}}>kompas</span></span></div><h1>{mode === 'login' ? 'Welkom terug!' : 'Maak je leeraccount'}</h1><p>{mode === 'login' ? 'Log in en ga verder waar je gebleven was.' : 'Maak gratis een account om je leerstof overal te bewaren.'}</p><div className="auth-tabs"><button className={mode === 'login' ? 'active' : ''} onClick={() => {setMode('login');setError('');setMessage('')}}>Inloggen</button><button className={mode === 'signup' ? 'active' : ''} onClick={() => {setMode('signup');setError('');setMessage('')}}>Account maken</button></div><form onSubmit={submit}><label className="auth-field">E-mailadres<input type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="jij@voorbeeld.nl"/></label><label className="auth-field">Wachtwoord<input type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength={8} required value={password} onChange={e=>setPassword(e.target.value)} placeholder="Minimaal 8 tekens"/></label><button className="auth-submit" disabled={busy}>{busy ? 'Even wachten…' : mode === 'login' ? 'Inloggen' : 'Gratis account maken'}</button></form><div className="auth-divider">of</div><button className="google-submit" disabled={busy} onClick={google}>G  Doorgaan met Google</button>{error&&<div className="auth-error" role="alert">{error}</div>}{message&&<div className="auth-success" role="status">{message}</div>}<p className="auth-footnote">Door verder te gaan gebruik je je eigen persoonlijke leeromgeving. Je wachtwoord wordt beheerd door Supabase en niet door LeerKompas.</p></section></main>
}
