import { useCallback, useEffect, useState } from 'react'
import { Check, RefreshCw, ShieldCheck, Users, BookOpen, RotateCcw, Trash2, Plus, X, Gamepad2, BookOpenCheck, ChevronLeft, Sparkles, Search, LayoutDashboard, Upload, LoaderCircle, FileText } from 'lucide-react'
import mammoth from 'mammoth'
import { recognize } from 'tesseract.js'
import { supabase } from './auth/supabase.js'

const blankQuestion = () => ({ type: 'multiple_choice', question: '', answer: '', explanation: '', options: '' })
const empty = { title: '', subject: 'Algemeen', topic: '', level: 'Alle niveaus', targetClass: '', targetSchool: '', difficulty: 'Basis', description: '', mode: 'normal', questions: [blankQuestion()] }


const cleanSourceLine = value => value.replace(/^\s*(?:[-•*]|\d+[.)])\s*/, '').trim()
const chapterLine = /^(?:lektion|leçon|lesson|les|hoofdstuk|kapitel|chapter|unit|eenheid|paragraaf)\s*\d+\b.*$/i
const languageLine = /^(?:nederlands|duits|engels|frans|spaans|latijn|italiaans|deutsch|english|français|español|latin|vocabulary|wortschatz|begrippen|woordenlijst)(?:\s*[-–—/]\s*(?:nederlands|duits|engels|frans|spaans|deutsch|english|français|español))?$/i
function glossaryPairs(source, instruction) {
  const requested = (instruction.match(/(?:lektion|leçon|lesson|les|hoofdstuk|kapitel|chapter|unit)\s*\d+/i)||[])[0]?.toLocaleLowerCase('nl-NL')
  let section='', active=!requested
  const pairs=[]
  for (const raw of source.split(/\r?\n/)) {
    const line=cleanSourceLine(raw)
    if(!line) continue
    if(chapterLine.test(line)){section=line;active=!requested||line.toLocaleLowerCase('nl-NL').includes(requested);continue}
    if(languageLine.test(line)) continue
    if(!active||line.length>180||/^pagina\s+\d+/i.test(line)||/^\d+$/.test(line))continue
    const match=line.match(/^(.{1,75}?)\s*(?::|\t|\s+[–—-]\s+|\s{2,})\s*(.{2,})$/)
    if(!match) continue
    const term=match[1].replace(/[;,.]$/,'').replace(/\s+/g,' ').trim(), meaning=match[2].replace(/\s+/g,' ').trim()
    if(!term||!meaning||term.length>75||languageLine.test(term)||chapterLine.test(term))continue
    if(/^(?:deutsch|english|français|español|nederlands)\s*[-–—/]\s*/i.test(term))continue
    pairs.push({term,meaning,section})
  }
  const seen=new Set()
  return pairs.filter(pair=>{const key=pair.term.toLocaleLowerCase('nl-NL');if(seen.has(key))return false;seen.add(key);return true}).slice(0,100)
}

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
  return { mode: form.mode || 'normal', sections: [{ title: form.topic.trim() || form.title.trim(), explanation: form.description.trim(), example: '', questions }] }
}

export default function AdminPanel({ canManageUsers = false, canReviewLessons = false }) {
  const [users,setUsers]=useState([]), [lessons,setLessons]=useState([]), [applications,setApplications]=useState([])
  const [form,setForm]=useState(empty), [editId,setEditId]=useState(null), [email,setEmail]=useState(''), [creatorStep,setCreatorStep]=useState('choice')
  const [sourceBusy,setSourceBusy]=useState(false), [sourceInstruction,setSourceInstruction]=useState(''), [sourceLanguage,setSourceLanguage]=useState('nld+eng'), [sourceFileName,setSourceFileName]=useState(''), [sourceStatus,setSourceStatus]=useState('')
  const [activeTab,setActiveTab]=useState(canManageUsers?'overview':'lessons'), [userQuery,setUserQuery]=useState(''), [lessonQuery,setLessonQuery]=useState('')
  const filteredUsers=users.filter(user=>(user.email||'').toLowerCase().includes(userQuery.toLowerCase()))
  const filteredLessons=lessons.filter(lesson=>[lesson.title,lesson.subject,lesson.topic,lesson.level].some(value=>(value||'').toLowerCase().includes(lessonQuery.toLowerCase())))
  const adminCount=users.filter(user=>user.role==='admin').length
  const totalSessions=users.reduce((sum,user)=>sum+(user.data?.studyStats?.sessions||[]).length,0)
  const totalXp=users.reduce((sum,user)=>sum+(Number(user.data?.studyStats?.xp)||0),0)
  const [busy,setBusy]=useState(false), [loading,setLoading]=useState(true), [notice,setNotice]=useState(''), [error,setError]=useState(''), [currentUserId,setCurrentUserId]=useState(null)
  const load=useCallback(async()=>{
    setLoading(true); setError('')
    const lessonRequest=supabase.from('lesson_catalog').select('*').order('created_at',{ascending:false})
    const [u,l,a]=await Promise.all([canManageUsers?supabase.rpc('admin_list_users'):Promise.resolve({data:null,error:null}),lessonRequest,canManageUsers?supabase.from('admin_role_applications').select('*').eq('status','pending').order('created_at',{ascending:true}):Promise.resolve({data:[],error:null})])
    if(u.error)setError(u.error.message); else if(canManageUsers)setUsers(u.data||[])
    if(l.error)setError(v=>[v,l.error.message].filter(Boolean).join(' · ')); else setLessons(l.data||[])
    if(a.error)setError(v=>[v,a.error.message].filter(Boolean).join(' · ')); else if(canManageUsers)setApplications(a.data||[])
    setLoading(false)
  },[canManageUsers])
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
    const payload={title:form.title.trim(),subject:form.subject.trim(),topic:form.topic.trim(),level:form.level,target_class:form.targetClass.trim(),target_school:form.targetSchool.trim(),difficulty:form.difficulty,description:form.description.trim(),content:buildContent(form),...(editId?{}:{is_public:false,publish_status:'private'})}
    const result=editId?await supabase.from('lesson_catalog').update(payload).eq('id',editId):await supabase.from('lesson_catalog').insert(payload)
    setBusy(false);if(result.error)setError(result.error.message);else{setNotice(editId?'Les bijgewerkt.':'Privéles aangemaakt. Je kunt de deellink hieronder kopiëren.');setForm(empty);setEditId(null);setCreatorStep('choice');load()}
  }
  const edit=l=>{
    setEditId(l.id)
    setForm({title:l.title||'',subject:l.subject||'',topic:l.topic||'',level:l.level||'Alle niveaus',targetClass:l.target_class||'',targetSchool:l.target_school||'',difficulty:l.difficulty||'Basis',description:l.description||'',mode:l.content?.mode||'normal',questions:questionsFromContent(l.content||{})});setCreatorStep('builder')
  }
  const remove=async l=>{if(!window.confirm('Les '+l.title+' verwijderen?'))return;const {error:e}=await supabase.from('lesson_catalog').delete().eq('id',l.id);if(e)setError(e.message);else{setNotice('Les verwijderd.');load()}}
  const importLessonSource=async file=>{
    if(!file)return
    setSourceBusy(true);setError('');setSourceStatus('Bestand lezen…');setSourceFileName(file.name)
    try{
      let text=''
      const lower=file.name.toLowerCase()
      if(lower.endsWith('.docx')){const result=await mammoth.extractRawText({arrayBuffer:await file.arrayBuffer()});text=result.value}
      else if(lower.endsWith('.txt'))text=await file.text()
      else if(file.type.startsWith('image/')){setSourceStatus('Tekst op de afbeelding herkennen…');const result=await recognize(file,sourceLanguage,{logger:m=>{if(m.status==='recognizing text')setSourceStatus('Tekst herkennen… '+Math.round((m.progress||0)*100)+'%')}});text=result.data.text}
      else throw new Error('Kies een DOCX-, TXT-, JPG-, PNG- of WEBP-bestand.')
      const pairs=glossaryPairs(text,sourceInstruction)
      if(!pairs.length)throw new Error('Ik vond geen duidelijke woord-begripparen. Gebruik bijvoorbeeld “Wort : woord” of “Wort — betekenis”, en geef eventueel een hoofdstukopdracht.')
      const generated=pairs.map(pair=>({type:'open',question:'Wat betekent '+pair.term+'?',answer:pair.meaning,explanation:[pair.section,sourceFileName].filter(Boolean).join(' · '),options:''}))
      setForm(current=>({...current,questions:[...(current.questions.length===1&&!current.questions[0].question.trim()&&!current.questions[0].answer.trim()?[]:current.questions),...generated]}))
      if(!form.title.trim())setForm(current=>({...current,title:file.name.replace(/\\.[^.]+$/,'').replace(/[_-]+/g,' ')}))
      setSourceStatus(pairs.length+' begrippen met betekenis gevonden. Controleer en verbeter de vragen hieronder.')
    }catch(e){setError(e?.message||'Het bestand kon niet worden verwerkt.');setSourceStatus('')}
    finally{setSourceBusy(false)}
  }
  const updateQuestion=(index,patch)=>setForm(current=>({...current,questions:current.questions.map((q,i)=>i===index?{...q,...patch}:q)}))
  const cancelEdit=()=>{setEditId(null);setForm(empty);setCreatorStep('choice')}
  const startCreating=mode=>{setForm({...empty,mode});setEditId(null);setCreatorStep('builder');setError('');setNotice('')}
  return <div className="admin-page">
    <div className="admin-heading"><div><span className="panel-kicker">SLIMLEREN · LESSTUDIO</span><h2>{canManageUsers?'Beheerderspaneel':'Mijn lesstudio'}</h2><p>Maak, deel en beheer lesmateriaal. Privélessen zijn alleen zichtbaar voor jou en via jouw deellink.</p></div><button className="soft-btn" onClick={load} disabled={loading}><RefreshCw size={15}/> {loading?'Laden…':'Vernieuwen'}</button></div>
    {canManageUsers&&<div className="admin-overview-grid">
      <article className="admin-overview-card"><span className="admin-overview-icon users"><Users size={18}/></span><div><small>Accounts</small><strong>{users.length}</strong><span>{adminCount} beheerders</span></div></article>
      <article className="admin-overview-card"><span className="admin-overview-icon lessons"><BookOpen size={18}/></span><div><small>Lesmateriaal</small><strong>{lessons.length}</strong><span>Beschikbare lessen</span></div></article>
      <article className="admin-overview-card"><span className="admin-overview-icon activity"><LayoutDashboard size={18}/></span><div><small>Leersessies</small><strong>{totalSessions}</strong><span>{totalXp.toLocaleString('nl-NL')} XP verdiend</span></div></article>
    </div>}
    <nav className="admin-tabs" aria-label="Beheerdersonderdelen">
      {(canManageUsers?[['overview','Overzicht'],['users','Gebruikers'],['lessons','Lesbibliotheek'],['applications','Aanvragen'],['rights','Beheerdersrechten']]:[['lessons','Mijn lessen']]).map(([id,label])=><button key={id} className={activeTab===id?'active':''} onClick={()=>setActiveTab(id)}>{label}{id==='users'?<span>{users.length}</span>:id==='lessons'?<span>{lessons.length}</span>:null}</button>)}
    </nav>
    {canManageUsers&&activeTab==='overview'&&<section className="panel admin-panel admin-welcome"><span className="panel-kicker">SNEL NAAR</span><h3>Wat wil je beheren?</h3><div className="admin-quick-links"><button onClick={()=>setActiveTab('users')}><Users size={18}/><span><strong>Gebruikers</strong><small>Accounts, voortgang en resets</small></span></button><button onClick={()=>setActiveTab('lessons')}><BookOpen size={18}/><span><strong>Lesbibliotheek</strong><small>Lessen en minigames maken of aanpassen</small></span></button><button onClick={()=>setActiveTab('rights')}><ShieldCheck size={18}/><span><strong>Beheerdersrechten</strong><small>Nieuwe beheerders toegang geven</small></span></button></div></section>}
    {notice&&<p className="admin-message"><Check size={15}/>{notice}</p>}{error&&<p className="admin-error">{error}</p>}
    {canManageUsers&&activeTab==='users'&&<section className="panel admin-panel"><div className="panel-head"><div><span className="panel-kicker">GEBRUIKERS</span><h3><Users size={17}/> Accounts en voortgang</h3></div><small>{users.length} accounts</small></div>
      <div className="admin-search"><Search size={16}/><input value={userQuery} onChange={e=>setUserQuery(e.target.value)} placeholder="Zoek op e-mailadres…" aria-label="Zoek gebruikers"/></div>
      {loading?'Gebruikers laden…':filteredUsers.map(u=><div className="admin-user" key={u.user_id}><div className="admin-user-info"><strong>{u.email||u.user_id}</strong><small>{u.data?.studyStats?.xp||0} XP · {(u.data?.studyStats?.sessions||[]).length} sessies</small></div>{canManageUsers&&<label className="admin-role-field">Rol<select aria-label={'Role voor '+(u.email||u.user_id)} value={u.role||'user'} disabled={busy||u.user_id===currentUserId} onChange={e=>changeRole(u,e.target.value)}><option value="user">Leerling</option><option value="lesson_maker">Lesmaker</option><option value="admin">Beheerder</option></select></label>}{canManageUsers&&<div className="admin-reset-actions"><button className="soft-btn" disabled={busy} onClick={()=>reset(u,'xp','XP')}>XP reset</button><button className="soft-btn" disabled={busy} onClick={()=>reset(u,'streak','Sessies')}>Sessies reset</button><button className="soft-btn" disabled={busy} onClick={()=>reset(u,'progress','Voortgang')}>Voortgang</button><button className="soft-btn" disabled={busy} onClick={()=>reset(u,'flashcards','Flashcards')}>Flashcards</button><button className="danger-btn" disabled={busy} onClick={()=>reset(u,'all','Alle gegevens')}><RotateCcw size={13}/> Alles</button></div>}</div>)}
    </section>}
    {canManageUsers&&activeTab==='applications'&&<section className="panel admin-panel"><div className="panel-head"><div><span className="panel-kicker">AANVRAGEN</span><h3>Beheerdersaanvragen</h3></div><small>{applications.length} open</small></div>{applications.length===0?<p className="admin-empty">Er zijn geen open aanvragen.</p>:applications.map(application=><article className="admin-application-row" key={application.id}><div><strong>{users.find(user=>user.user_id===application.user_id)?.email||application.user_id}</strong><small>{new Date(application.created_at).toLocaleDateString('nl-NL')}</small><p>{application.reason}</p></div><div className="admin-application-actions"><button className="primary-btn" disabled={busy} onClick={async()=>{setBusy(true);const {error:roleError}=await supabase.rpc('admin_set_user_role',{p_user_id:application.user_id,p_role:'admin'});if(!roleError){const {error:reviewError}=await supabase.from('admin_role_applications').update({status:'approved',reviewed_at:new Date().toISOString()}).eq('id',application.id);if(reviewError)setError(reviewError.message);else setNotice('Beheerdersaanvraag goedgekeurd.')}else setError(roleError.message);setBusy(false);load()}}>Goedkeuren</button><button className="danger-btn" disabled={busy} onClick={async()=>{setBusy(true);const {error:e}=await supabase.from('admin_role_applications').update({status:'rejected',reviewed_at:new Date().toISOString()}).eq('id',application.id);setBusy(false);if(e)setError(e.message);else setNotice('Aanvraag afgewezen.');load()}}>Afwijzen</button></div></article>)}</section>}
    {canManageUsers&&activeTab==='rights'&&<section className="panel admin-panel"><div className="panel-head"><div><span className="panel-kicker">RECHTEN</span><h3><ShieldCheck size={17}/> Beheerder toevoegen</h3></div></div><p className="muted">Maak eerst het account aan in Supabase → Authentication → Users. Geef het daarna hier beheerdersrechten.</p><form className="admin-inline-form" onSubmit={grant}><input type="email" required placeholder="beheerder@voorbeeld.nl" value={email} onChange={e=>setEmail(e.target.value)}/><button className="primary-btn" disabled={busy}>Beheerder toevoegen</button></form></section>}
    {activeTab==='lessons'&&<section className="panel admin-panel"><div className="panel-head"><div><span className="panel-kicker">LESMATERIAAL</span><h3><BookOpen size={17}/> Lesbibliotheek</h3></div><small>{lessons.length} lessen</small></div>
      {creatorStep==='choice'&&<div className="lesson-create-start">
        <div className="lesson-create-intro"><span className="panel-kicker">NIEUW LESMATERIAAL</span><h4>Klaar om iets te maken?</h4><p>Kies eerst hoe leerlingen jouw les gaan beleven. Daarna bouw je de vragen één voor één op.</p></div>
        <button type="button" className="lesson-create-main" onClick={()=>setCreatorStep('mode')}><span className="lesson-create-main-icon"><Plus size={21}/></span><span><strong>Les maken</strong><small>Start een nieuwe les of minigame</small></span><ChevronLeft className="lesson-create-main-arrow" size={18}/></button>
      </div>}
      {creatorStep==='mode'&&<div className="lesson-mode-picker">
        <button type="button" className="lesson-back-link" onClick={()=>setCreatorStep('choice')}><ChevronLeft size={15}/> Terug</button>
        <div className="lesson-create-intro"><span className="panel-kicker">STAP 1 · KIES JE VORM</span><h4>Wat wil je maken?</h4><p>Kies een normale les of maak er een minigame van.</p></div>
        <div className="lesson-mode-grid">
          <button type="button" className="lesson-mode-card normal" onClick={()=>startCreating('normal')}><span className="lesson-mode-icon"><BookOpenCheck size={25}/></span><strong>Normale les</strong><small>Leer stap voor stap met vragen en uitleg.</small><span className="lesson-mode-cta">Kies normale les <ChevronLeft size={15}/></span></button>
          <button type="button" className="lesson-mode-card mini" onClick={()=>startCreating('minigame')}><span className="lesson-mode-icon"><Gamepad2 size={25}/></span><strong>Minigame</strong><small>Maak een speelse quiz met korte vragen.</small><span className="lesson-mode-cta">Kies minigame <ChevronLeft size={15}/></span></button>
        </div>
      </div>}
      {creatorStep==='builder'&&<form className="admin-lesson-form" onSubmit={save}>
        <div className="lesson-builder-top"><button type="button" className="lesson-back-link" onClick={cancelEdit}><ChevronLeft size={15}/> Terug naar les maken</button><span className={form.mode==='minigame'?'lesson-mode-tag mini':'lesson-mode-tag'}>{form.mode==='minigame'?<Gamepad2 size={13}/>:<BookOpenCheck size={13}/>} {form.mode==='minigame'?'Minigame':'Normale les'}</span></div>
        <div className="admin-lesson-form-heading"><div><h4>{editId?'Les bewerken':form.mode==='minigame'?'Minigame maken':'Normale les maken'}</h4><p>Vul de gegevens in en voeg daarna je vragen toe.</p></div><span className="admin-question-count">{form.questions.length} {form.questions.length===1?'vraag':'vragen'}</span></div>
        <div className="admin-form-grid">
          <label>Titel<input required value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="Bijv. Het zonnestelsel"/></label>
          <label>Vak<input required value={form.subject} onChange={e=>setForm({...form,subject:e.target.value})} placeholder="Bijv. Aardrijkskunde"/></label>
          <label>Onderwerp<input required value={form.topic} onChange={e=>setForm({...form,topic:e.target.value})} placeholder="Bijv. Planeten"/></label>
          <label>Niveau<select value={form.level} onChange={e=>setForm({...form,level:e.target.value})}><option>Alle niveaus</option><option>vmbo-basis</option><option>vmbo-kader</option><option>vmbo-gl/tl</option><option>havo</option><option>vwo</option><option>mbo</option><option>hbo</option><option>wo</option><option>Anders</option><option>Onderbouw</option><option>Bovenbouw</option></select></label>
          <label>Specifieke klas <span className="admin-optional">(optioneel)</span><input value={form.targetClass} onChange={e=>setForm({...form,targetClass:e.target.value})} placeholder="Bijv. 2 havo"/></label>
          <label>Specifieke school <span className="admin-optional">(optioneel)</span><input value={form.targetSchool} onChange={e=>setForm({...form,targetSchool:e.target.value})} placeholder="Alleen tonen aan leerlingen van deze school"/></label>
          <label>Moeilijkheid<select value={form.difficulty} onChange={e=>setForm({...form,difficulty:e.target.value})}><option>Basis</option><option>Gemiddeld</option><option>Uitdagend</option></select></label>
        </div>
        <label>Beschrijving van de les <span className="admin-optional">(optioneel)</span><textarea rows="2" value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Waar gaat deze les over?"/></label>
        <section className="lesson-source-import"><div className="lesson-source-import-heading"><span className="lesson-source-icon"><Upload size={18}/></span><div><strong>Vragen maken vanuit een bestand</strong><small>Upload een Word-bestand, tekstbestand of foto. Begrippen met hun betekenis worden omgezet naar open vragen.</small></div></div><label>Extra opdracht <span className="admin-optional">(optioneel)</span><input value={sourceInstruction} onChange={e=>setSourceInstruction(e.target.value)} placeholder="Bijv. alleen de woorden van Lektion 2"/></label><div className="lesson-source-controls"><label>Tekst op foto herkennen<select value={sourceLanguage} onChange={e=>setSourceLanguage(e.target.value)}><option value="nld+eng">Nederlands / Engels</option><option value="deu+eng">Duits / Engels</option><option value="fra+eng">Frans / Engels</option><option value="spa+eng">Spaans / Engels</option><option value="eng">Engels</option></select></label><label className="soft-btn lesson-source-file"><Upload size={15}/> Bestand of foto kiezen<input type="file" accept=".docx,.txt,image/jpeg,image/png,image/webp" disabled={sourceBusy} onChange={e=>{importLessonSource(e.target.files?.[0]);e.target.value=''}}/></label></div>{sourceBusy&&<p className="lesson-source-status"><LoaderCircle size={15} className="spin"/>{sourceStatus}</p>}{!sourceBusy&&sourceStatus&&<p className="lesson-source-status"><FileText size={15}/>{sourceStatus}</p>}{sourceFileName&&<small className="lesson-source-filename">Bron: {sourceFileName}</small>}</section>
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
      </form>}
      <div className="admin-search"><Search size={16}/><input value={lessonQuery} onChange={e=>setLessonQuery(e.target.value)} placeholder="Zoek op titel, vak, onderwerp of niveau…" aria-label="Zoek lessen"/></div>
      {filteredLessons.map(l=><div className="admin-lesson-row" key={l.id}><div><strong>{l.title}</strong><small>{l.subject} · {l.topic} · {l.level} · {l.difficulty} · {l.publish_status==='approved'?'Openbaar':l.publish_status==='pending'?'Wacht op goedkeuring':'Privé'}</small></div>{(canManageUsers||(l.created_by===currentUserId&&!l.is_public))&&<button className="soft-btn" onClick={()=>edit(l)}>Bewerken</button>}{l.created_by===currentUserId&&<button className="soft-btn" onClick={()=>navigator.clipboard.writeText(window.location.origin+'/?share='+l.share_token).then(()=>setNotice('Deellink gekopieerd.'))}>Deellink kopiëren</button>}{l.created_by===currentUserId&&l.publish_status!=='pending'&&l.publish_status!=='approved'&&<button className="soft-btn" disabled={busy} onClick={async()=>{const {error:e}=await supabase.from('lesson_catalog').update({publish_status:'pending',is_public:false}).eq('id',l.id);if(e)setError(e.message);else{setNotice('Les aangeboden voor de openbare bibliotheek.');load()}}}>Aanbieden</button>}{canReviewLessons&&l.publish_status==='pending'&&<><button className="primary-btn" disabled={busy} onClick={async()=>{const {error:e}=await supabase.from('lesson_catalog').update({publish_status:'approved',is_public:true}).eq('id',l.id);if(e)setError(e.message);else setNotice('Les goedgekeurd en gepubliceerd.');load()}}>Publiceren</button><button className="danger-btn" disabled={busy} onClick={async()=>{const {error:e}=await supabase.from('lesson_catalog').update({publish_status:'rejected',is_public:false}).eq('id',l.id);if(e)setError(e.message);else setNotice('Les teruggestuurd naar de maker.');load()}}>Afwijzen</button></>}{(canManageUsers||(l.created_by===currentUserId&&!l.is_public))&&<button className="danger-btn" onClick={()=>remove(l)}><Trash2 size={13}/> Verwijderen</button>}</div>)}
      {filteredLessons.length===0&&<p className="admin-empty">Geen lessen gevonden. Pas je zoekopdracht aan of maak een nieuwe les.</p>}
    </section>}
  </div>
}
