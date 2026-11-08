import { useCallback, useEffect, useState } from 'react'
import { Check, RefreshCw, ShieldCheck, Users, BookOpen, RotateCcw, Trash2 } from 'lucide-react'
import { supabase } from './auth/supabase.js'

const empty = {title:'',subject:'Aardrijkskunde',topic:'',level:'Onderbouw',difficulty:'Basis',description:'',content:'{"sections":[]}'}
export default function AdminPanel() {
  const [users,setUsers]=useState([]), [lessons,setLessons]=useState([])
  const [form,setForm]=useState(empty), [editId,setEditId]=useState(null), [email,setEmail]=useState('')
  const [busy,setBusy]=useState(false), [loading,setLoading]=useState(true), [notice,setNotice]=useState(''), [error,setError]=useState(''), [currentUserId,setCurrentUserId]=useState(null)
  const load=useCallback(async()=>{
    setLoading(true); setError('')
    const [u,l]=await Promise.all([supabase.rpc('admin_list_users'),supabase.from('lesson_catalog').select('*').order('created_at',{ascending:false})])
    if(u.error)setError(u.error.message); else setUsers(u.data||[])
    if(l.error)setError(v=>[v,l.error.message].filter(Boolean).join(' · ')); else setLessons(l.data||[])
    setLoading(false)
  },[])
  useEffect(()=>{load();supabase.auth.getUser().then(({data})=>setCurrentUserId(data.user?.id||null))},[load])
  const reset=async(user,section,label)=>{
    if(!window.confirm(label+' resetten voor '+user.email+'? Dit kan niet ongedaan worden gemaakt.'))return
    setBusy(true);setError('');const {error:e}=await supabase.rpc('admin_reset_user_data',{p_user_id:user.user_id,p_sections:[section]});setBusy(false)
    if(e)setError(e.message);else{setNotice(label+' gereset. Vraag de gebruiker LeerKompas opnieuw te laden om de wijziging direct te zien.');load()}
  }
  const grant=async e=>{e.preventDefault();setBusy(true);setError('');const {error:x}=await supabase.rpc('admin_grant_admin',{p_email:email.trim()});setBusy(false);if(x)setError(x.message);else{setNotice('Beheerrechten toegekend aan '+email);setEmail('');load()}}\n  const changeRole=async(user,role)=>{setBusy(true);setError('');setNotice('');const {error:e}=await supabase.rpc('admin_set_user_role',{p_user_id:user.user_id,p_role:role});setBusy(false);if(e){setError(e.message);load()}else{setNotice('Role bijgewerkt voor '+(user.email||'de gebruiker')+'.');load()}}
  const save=async e=>{
    e.preventDefault();setBusy(true);setError('');let content
    try{content=JSON.parse(form.content||'{}')}catch{setBusy(false);setError('Lesinhoud moet geldige JSON zijn.');return}
    const payload={title:form.title.trim(),subject:form.subject.trim(),topic:form.topic.trim(),level:form.level,difficulty:form.difficulty,description:form.description.trim(),content}
    const result=editId?await supabase.from('lesson_catalog').update(payload).eq('id',editId):await supabase.from('lesson_catalog').insert(payload)
    setBusy(false);if(result.error)setError(result.error.message);else{setNotice(editId?'Les bijgewerkt.':'Les aangemaakt.');setForm(empty);setEditId(null);load()}
  }
  const edit=l=>{setEditId(l.id);setForm({title:l.title||'',subject:l.subject||'',topic:l.topic||'',level:l.level||'Onderbouw',difficulty:l.difficulty||'Basis',description:l.description||'',content:JSON.stringify(l.content||{},null,2)})}
  const remove=async l=>{if(!window.confirm('Les '+l.title+' verwijderen?'))return;const {error:e}=await supabase.from('lesson_catalog').delete().eq('id',l.id);if(e)setError(e.message);else{setNotice('Les verwijderd.');load()}}
  return <div className="admin-page">
    <div className="admin-heading"><div><span className="panel-kicker">LEERKOMPAS · BEHEER</span><h2>Beheerderspaneel</h2><p>Accounts, leerstatistieken en lessen beheren.</p></div><button className="soft-btn" onClick={load}><RefreshCw size={15}/> Vernieuwen</button></div>
    {notice&&<p className="admin-message"><Check size={15}/>{notice}</p>}{error&&<p className="admin-error">{error}</p>}
    <section className="panel admin-panel"><div className="panel-head"><div><span className="panel-kicker">GEBRUIKERS</span><h3><Users size={17}/> Accounts en voortgang</h3></div><small>{users.length} accounts</small></div>
      {loading?'Gebruikers laden…':users.map(u=><div className="admin-user" key={u.user_id}><div className="admin-user-info"><strong>{u.email||u.user_id}</strong><small>{u.data?.studyStats?.xp||0} XP · {(u.data?.studyStats?.sessions||[]).length} sessies</small></div><label className="admin-role-field">Role<select aria-label={'Role voor '+(u.email||u.user_id)} value={u.role||'user'} disabled={busy||u.user_id===currentUserId} onChange={e=>changeRole(u,e.target.value)}><option value="user">Gebruiker</option><option value="admin">Beheerder</option></select></label><div className="admin-reset-actions"><button className="soft-btn" disabled={busy} onClick={()=>reset(u,'xp','XP')}>XP reset</button><button className="soft-btn" disabled={busy} onClick={()=>reset(u,'streak','Sessies')}>Sessies reset</button><button className="soft-btn" disabled={busy} onClick={()=>reset(u,'progress','Voortgang')}>Voortgang</button><button className="soft-btn" disabled={busy} onClick={()=>reset(u,'flashcards','Flashcards')}>Flashcards</button><button className="danger-btn" disabled={busy} onClick={()=>reset(u,'all','Alle gegevens')}><RotateCcw size={13}/> Alles</button></div></div>)}
    </section>
    <section className="panel admin-panel"><div className="panel-head"><div><span className="panel-kicker">RECHTEN</span><h3><ShieldCheck size={17}/> Beheerder toevoegen</h3></div></div><p className="muted">Maak eerst het account aan in Supabase → Authentication → Users. Geef het daarna hier beheerdersrechten.</p><form className="admin-inline-form" onSubmit={grant}><input type="email" required placeholder="beheerder@voorbeeld.nl" value={email} onChange={e=>setEmail(e.target.value)}/><button className="primary-btn" disabled={busy}>Beheerder toevoegen</button></form></section>
    <section className="panel admin-panel"><div className="panel-head"><div><span className="panel-kicker">LESMATERIAAL</span><h3><BookOpen size={17}/> Lesbibliotheek</h3></div><small>{lessons.length} lessen</small></div>
      <form className="admin-lesson-form" onSubmit={save}><h4>{editId?'Les bewerken':'Nieuwe les maken'}</h4><div className="admin-form-grid">
        <label>Titel<input required value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></label><label>Vak<input required value={form.subject} onChange={e=>setForm({...form,subject:e.target.value})}/></label><label>Onderwerp<input required value={form.topic} onChange={e=>setForm({...form,topic:e.target.value})}/></label>
        <label>Niveau<select value={form.level} onChange={e=>setForm({...form,level:e.target.value})}><option>Onderbouw</option><option>Bovenbouw</option><option>Alle niveaus</option></select></label><label>Moeilijkheid<select value={form.difficulty} onChange={e=>setForm({...form,difficulty:e.target.value})}><option>Basis</option><option>Gemiddeld</option><option>Uitdagend</option></select></label></div>
        <label>Beschrijving<textarea rows="2" value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/></label><label>Lesinhoud (JSON)<textarea className="admin-json" rows="7" value={form.content} onChange={e=>setForm({...form,content:e.target.value})}/></label>
        <div className="admin-form-actions"><button className="primary-btn" disabled={busy}>{editId?'Wijzigingen opslaan':'Les opslaan'}</button>{editId&&<button type="button" className="soft-btn" onClick={()=>{setEditId(null);setForm(empty)}}>Annuleren</button>}</div>
      </form>
      {lessons.map(l=><div className="admin-lesson-row" key={l.id}><div><strong>{l.title}</strong><small>{l.subject} · {l.topic} · {l.level} · {l.difficulty}</small></div><button className="soft-btn" onClick={()=>edit(l)}>Bewerken</button><button className="danger-btn" onClick={()=>remove(l)}><Trash2 size={13}/> Verwijderen</button></div>)}
    </section>
  </div>
}