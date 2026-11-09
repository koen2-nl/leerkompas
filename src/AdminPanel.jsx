import { useCallback, useEffect, useState } from 'react'
import { Check, RefreshCw, ShieldCheck, Users, BookOpen, RotateCcw, Trash2, Plus, X, HelpCircle } from 'lucide-react'
import { supabase } from './auth/supabase.js'

const blankQuestion = () => ({ type: 'multiple_choice', question: '', answer: '', explanation: '', options: '' })
const empty = { title: '', subject: 'Aardrijkskunde', topic: '', level: 'Onderbouw', difficulty: 'Basis', description: '', questions: [blankQuestion()] }

function questionsFromContent(content) {
  const questions = (content?.sections || []).flatMap(section => section.questions || [])
  if (!questions.length) return [blankQuestion()]
  return questions.map(q => {
    const type = q.type === 'open' || q.type === 'true_false' ? q.type : 'multiple_choice'
    const options = type === 'true_false' ? '' : (q.options || []).join('\n')
    const answer = type === 'multiple_choice' ? (q.options || [])[q.answer] || '' : type === 'true_false' ? ((q.answer === 0 || q.answer === 'Waar') ? 'Waar' : 'Niet waar') : (q.answer || '')
    return { type, question: q.q || q.question || '', answer, explanation: q.feedback || q.explanation || '', options }
  })
}

function buildContent(form) {
  const questions = form.questions.map(q => {
    if (q.type === 'multiple_choice') {
      const options = q.options.split('\n').map(value => value.trim()).filter(Boolean)
      if (!options.includes(q.answer.trim())) options.push(q.answer.trim())
      return { type: q.type, q: q.question.trim(), options, answer: options.indexOf(q.answer.trim()), feedback: q.explanation.trim() }
    }
    if (q.type === 'true_false') return { type: q.type, q: q.question.trim(), options: ['Waar', 'Niet waar'], answer: q.answer === 'Waar' ? 0 : 1, feedback: q.explanation.trim() }
    return { type: q.type, q: q.question.trim(), answer: q.answer.trim(), feedback: q.explanation.trim() }
  })
  return { sections: [{ title: form.topic.trim() || form.title.trim(), explanation: form.description.trim(), example: '', questions }] }
}

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
    if(e)setError(e.message);else{setNotice(label+' gereset. Vraag de gebruiker SlimLeren opnieuw te laden om de wijziging direct te zien.');load()}
  }
  const grant=async e=>{e.preventDefault();setBusy(true);setError('');const {error:x}=await supabase.rpc('admin_grant_admin',{p_email:email.trim()});setBusy(false);if(x)setError(x.message);else{setNotice('Beheerrechten toegekend aan '+email);setEmail('');load()}}
  const changeRole=async(user,role)=>{setBusy(true);setError('');setNotice('');const {error:e}=await supabase.rpc('admin_set_user_role',{p_user_id:user.user_id,p_role:role});setBusy(false);if(e){setError(e.message);load()}else{setNotice('Role bijgewerkt voor '+(user.email||'de gebruiker')+'.');load()}}
  const save=async e=>{
    e.preventDefault()
    if(!form.questions.length || form.questions.some(q=>!q.question.trim() || !q.answer.trim() || (q.type==='multiple_choice' && !q.options.split('\n').some(option=>option.trim())))){
      setError('Vul bij iedere vraag de vraag en het antwoord in. Voeg bij meerkeuze ook antwoordopties toe.');return
    }
    setBusy(true);setError('')
    const payload={title:form.title.trim(),subject:form.subject.trim(),topic:form.topic.trim(),level:form.level,difficulty:form.difficulty,description:form.description.trim(),content:buildContent(form)}
    const result=editId?await supabase.from('lesson_catalog').update(payload).eq('id',editId):await supabase.from('lesson_catalog').insert(payload)
    setBusy(false);if(result.error)setError(result.error.message);else{setNotice(editId?'Les bijgewerkt.':'Les aangemaakt.');setForm(empty);setEditId(null);load()}
  }
  const edit=l=>{
    setEditId(l.id)
    setForm({title:l.title||'',subject:l.subject||'',topic:l.topic||'',level:l.level||'Onderbouw',difficulty:l.difficulty||'Basis',description:l.description||'',questions:questionsFromContent(l.content||{})})
  }
  const remove=async l=>{if(!window.confirm('Les '+l.title+' verwijderen?'))return;const {error:e}=await supabase.from('lesson_catalog').delete().eq('id',l.id);if(e)setError(e.message);else{setNotice('Les verwijderd.');load()}}
  const updateQuestion=(index,patch)=>setForm(current=>({...current,questions:current.questions.map((q,i)=>i===index?{...q,...patch}:q)}))
  const cancelEdit=()=>{setEditId(null);setForm(empty)}
  return <div className="admin-page">
    <div className="admin-heading"><div><span className="panel-kicker">SLIMLEREN · BEHEER</span><h2>Beheerderspaneel</h2><p>Accounts, leerstatistieken en lessen beheren.</p></div><button className="soft-btn" onClick={load}><RefreshCw size={15}/> Vernieuwen</button></div>
    {notice&&<p className="admin-message"><Check size={15}/>{notice}</p>}{error&&<p className="admin-error">{error}</p>}
    <section className="panel admin-panel"><div className="panel-head"><div><span className="panel-kicker">GEBRUIKERS</span><h3><Users size={17}/> Accounts en voortgang</h3></div><small>{users.length} accounts</small></div>
      {loading?'Gebruikers laden…':users.map(u=><div className="admin-user" key={u.user_id}><div className="admin-user-info"><strong>{u.email||u.user_id}</strong><small>{u.data?.studyStats?.xp||0} XP · {(u.data?.studyStats?.sessions||[]).length} sessies</small></div><label className="admin-role-field">Role<select aria-label={'Role voor '+(u.email||u.user_id)} value={u.role||'user'} disabled={busy||u.user_id===currentUserId} onChange={e=>changeRole(u,e.target.value)}><option value="user">Gebruiker</option><option value="admin">Beheerder</option></select></label><div className="admin-reset-actions"><button className="soft-btn" disabled={busy} onClick={()=>reset(u,'xp','XP')}>XP reset</button><button className="soft-btn" disabled={busy} onClick={()=>reset(u,'streak','Sessies')}>Sessies reset</button><button className="soft-btn" disabled={busy} onClick={()=>reset(u,'progress','Voortgang')}>Voortgang</button><button className="soft-btn" disabled={busy} onClick={()=>reset(u,'flashcards','Flashcards')}>Flashcards</button><button className="danger-btn" disabled={busy} onClick={()=>reset(u,'all','Alle gegevens')}><RotateCcw size={13}/> Alles</button></div></div>)}
    </section>
    <section className="panel admin-panel"><div className="panel-head"><div><span className="panel-kicker">RECHTEN</span><h3><ShieldCheck size={17}/> Beheerder toevoegen</h3></div></div><p className="muted">Maak eerst het account aan in Supabase → Authentication → Users. Geef het daarna hier beheerdersrechten.</p><form className="admin-inline-form" onSubmit={grant}><input type="email" required placeholder="beheerder@voorbeeld.nl" value={email} onChange={e=>setEmail(e.target.value)}/><button className="primary-btn" disabled={busy}>Beheerder toevoegen</button></form></section>
    <section className="panel admin-panel"><div className="panel-head"><div><span className="panel-kicker">LESMATERIAAL</span><h3><BookOpen size={17}/> Lesbibliotheek</h3></div><small>{lessons.length} lessen</small></div>
      <form className="admin-lesson-form" onSubmit={save}>
        <div className="admin-lesson-form-heading"><div><h4>{editId?'Les bewerken':'Nieuwe les maken'}</h4><p>Maak een les en voeg daaronder eenvoudig je vragen toe.</p></div><span className="admin-question-count">{form.questions.length} {form.questions.length===1?'vraag':'vragen'}</span></div>
        <div className="admin-form-grid">
          <label>Titel<input required value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="Bijv. Het zonnestelsel"/></label>
          <label>Vak<input required value={form.subject} onChange={e=>setForm({...form,subject:e.target.value})} placeholder="Bijv. Aardrijkskunde"/></label>
          <label>Onderwerp<input required value={form.topic} onChange={e=>setForm({...form,topic:e.target.value})} placeholder="Bijv. Planeten"/></label>
          <label>Niveau<select value={form.level} onChange={e=>setForm({...form,level:e.target.value})}><option>Onderbouw</option><option>Bovenbouw</option><option>Alle niveaus</option></select></label>
          <label>Moeilijkheid<select value={form.difficulty} onChange={e=>setForm({...form,difficulty:e.target.value})}><option>Basis</option><option>Gemiddeld</option><option>Uitdagend</option></select></label>
        </div>
        <label>Beschrijving van de les <span className="admin-optional">(optioneel)</span><textarea rows="2" value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Waar gaat deze les over?"/></label>
        <div className="admin-question-builder-heading"><div><span className="panel-kicker">VRAGEN</span><strong>Vragen van je les</strong><small>De vraag en het antwoord zijn verplicht. Uitleg is optioneel.</small></div><button type="button" className="soft-btn" onClick={()=>setForm(current=>({...current,questions:[...current.questions,blankQuestion()]}))}><Plus size={15}/> Vraag toevoegen</button></div>
        <div className="admin-question-list">
          {form.questions.map((q,index)=><article className="admin-question-card" key={index}>
            <div className="admin-question-card-top"><strong>Vraag {index+1}</strong>{form.questions.length>1&&<button type="button" className="admin-remove-question" aria-label={'Vraag '+(index+1)+' verwijderen'} onClick={()=>setForm(current=>({...current,questions:current.questions.filter((_,i)=>i!==index)}))}><X size={16}/></button>}</div>
            <label>Soort vraag<select value={q.type} onChange={e=>updateQuestion(index,{type:e.target.value,answer:'',options:''})}><option value="multiple_choice">Meerkeuzevraag</option><option value="open">Open vraag</option><option value="true_false">Waar / niet waar</option></select></label>
            <label>Wat is de vraag? <span className="admin-required">Verplicht</span><textarea rows="2" required value={q.question} onChange={e=>updateQuestion(index,{question:e.target.value})} placeholder="Typ hier de vraag..."/></label>
            {q.type==='multiple_choice'&&<label>Antwoordopties <span className="admin-optional">(één per regel)</span><textarea rows="3" value={q.options} onChange={e=>updateQuestion(index,{options:e.target.value})} placeholder={'Bijv.\nAarde\nMars\nJupiter'}/></label>}
            <label>{q.type==='true_false'?'Wat is het juiste antwoord?':'Wat is het juiste antwoord?'} <span className="admin-required">Verplicht</span>{q.type==='true_false'?<select required value={q.answer} onChange={e=>updateQuestion(index,{answer:e.target.value})}><option value="">Kies het antwoord</option><option>Waar</option><option>Niet waar</option></select>:<textarea rows="2" required value={q.answer} onChange={e=>updateQuestion(index,{answer:e.target.value})} placeholder="Typ hier het juiste antwoord..."/>}</label>
            <label>Uitleg bij de vraag <span className="admin-optional">(niet verplicht)</span><textarea rows="2" value={q.explanation} onChange={e=>updateQuestion(index,{explanation:e.target.value})} placeholder="Leg eventueel uit waarom dit het juiste antwoord is..."/></label>
          </article>)}
        </div>
        <div className="admin-form-actions"><button className="primary-btn" disabled={busy||!form.questions.length}>{editId?'Wijzigingen opslaan':'Les opslaan'}</button>{editId&&<button type="button" className="soft-btn" onClick={cancelEdit}>Annuleren</button>}</div>
      </form>
      {lessons.map(l=><div className="admin-lesson-row" key={l.id}><div><strong>{l.title}</strong><small>{l.subject} · {l.topic} · {l.level} · {l.difficulty}</small></div><button className="soft-btn" onClick={()=>edit(l)}>Bewerken</button><button className="danger-btn" onClick={()=>remove(l)}><Trash2 size={13}/> Verwijderen</button></div>)}
    </section>
  </div>
}
