import { useMemo, useState } from 'react'
import { CalendarDays, Check, ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react'

const today = () => {
  const date = new Date()
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}
const dateFrom = value => new Date(value + 'T12:00:00')
const dateKey = date => {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 10)
}
const emptyForm = date => ({ title: '', subject: '', kind: 'Toets', date: date || today(), time: '09:00', minutes: '30' })
const monthNames = ['januari','februari','maart','april','mei','juni','juli','augustus','september','oktober','november','december']
const weekdays = ['Ma','Di','Wo','Do','Vr','Za','Zo']

export default function Planning({ planning = [], setPlanning, subjects = [] }) {
  const [form, setForm] = useState(() => emptyForm())
  const [showForm, setShowForm] = useState(false)
  const [view, setView] = useState('maand')
  const [selectedDate, setSelectedDate] = useState(today)
  const [visibleDate, setVisibleDate] = useState(() => dateFrom(today()))
  const sorted = useMemo(() => [...planning].sort((a,b) => a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || '')), [planning])
  const openItems = sorted.filter(item => !item.done)
  const completed = sorted.filter(item => item.done)
  const selectedItems = sorted.filter(item => item.date === selectedDate)
  const addItem = event => {
    event.preventDefault()
    if (!form.title.trim() || !form.subject.trim() || !form.date) return
    setPlanning(items => [...items, { ...form, id: Date.now().toString(36) + Math.random().toString(36).slice(2,7), title: form.title.trim(), subject: form.subject.trim(), minutes: Math.max(5,Math.min(600,Number(form.minutes)||30)), done:false, createdAt:new Date().toISOString() }])
    setSelectedDate(form.date)
    setVisibleDate(dateFrom(form.date))
    setForm(emptyForm(form.date))
    setShowForm(false)
  }
  const toggle = id => setPlanning(items => items.map(item => item.id === id ? {...item,done:!item.done} : item))
  const remove = id => setPlanning(items => items.filter(item => item.id !== id))
  const shift = amount => {
    const next = new Date(visibleDate)
    if (view === 'week') next.setDate(next.getDate() + amount * 7)
    else next.setMonth(next.getMonth() + amount, 1)
    setVisibleDate(next)
  }
  const days = useMemo(() => {
    if (view === 'week') {
      const start = new Date(visibleDate)
      start.setDate(start.getDate() - ((start.getDay() + 6) % 7))
      return Array.from({length:7},(_,i)=>{const d=new Date(start);d.setDate(start.getDate()+i);return d})
    }
    const first = new Date(visibleDate.getFullYear(),visibleDate.getMonth(),1)
    const start = new Date(first)
    start.setDate(1 - ((first.getDay()+6)%7))
    return Array.from({length:42},(_,i)=>{const d=new Date(start);d.setDate(start.getDate()+i);return d})
  },[view,visibleDate,selectedDate])
  const heading = view === 'week'
    ? `${days[0].getDate()} – ${days[6].getDate()} ${monthNames[days[6].getMonth()]} ${days[6].getFullYear()}`
    : `${monthNames[visibleDate.getMonth()]} ${visibleDate.getFullYear()}`
  const formatDate = value => dateFrom(value).toLocaleDateString('nl-NL',{weekday:'long',day:'numeric',month:'long'})
  const renderItem = item => <article className={'planner-item'+(item.done?' is-done':'')} key={item.id}>
    <button className="planner-check" type="button" onClick={()=>toggle(item.id)} aria-label={item.done?'Markeer als niet afgerond':'Markeer als afgerond'}>{item.done&&<Check size={15}/>}</button>
    <div className="planner-item-main"><div className="planner-item-meta"><span className={'planner-kind kind-'+item.kind.toLowerCase()}>{item.kind}</span><span>{item.time || 'Hele dag'} · {item.minutes} min</span></div><strong>{item.title}</strong><small>{item.subject}</small></div>
    <button className="planner-delete" type="button" onClick={()=>remove(item.id)} aria-label="Verwijder agendapunt"><Trash2 size={16}/></button>
  </article>
  return <div className="planner-page">
    <section className="planner-intro panel"><div><span className="panel-kicker">JOUW SCHOOLAGENDA</span><h2>Alles op één plek</h2><p>Plan toetsen, opdrachten en leermomenten. Kies een dag in de agenda om te zien wat er gepland staat of voeg meteen iets toe.</p></div><div className="planner-summary"><strong>{openItems.length}</strong><span>open agendapunten</span><small>{completed.length} afgerond</small></div></section>
    <section className="panel planner-calendar">
      <div className="planner-calendar-top"><div><span className="panel-kicker">AGENDA</span><h3>{heading}</h3></div><div className="planner-calendar-actions"><button type="button" className="soft-btn" onClick={()=>{setVisibleDate(dateFrom(today()));setSelectedDate(today())}}>Vandaag</button><button className="planner-arrow" type="button" onClick={()=>shift(-1)} aria-label="Vorige periode"><ChevronLeft size={18}/></button><button className="planner-arrow" type="button" onClick={()=>shift(1)} aria-label="Volgende periode"><ChevronRight size={18}/></button><div className="planner-view-toggle"><button className={view==='maand'?'active':''} onClick={()=>setView('maand')} type="button">Maand</button><button className={view==='week'?'active':''} onClick={()=>setView('week')} type="button">Week</button></div></div></div>
      <div className="planner-calendar-grid">{weekdays.map(day=><div className="planner-weekday" key={day}>{day}</div>)}{days.map(day=>{const key=dateKey(day);const items=sorted.filter(item=>item.date===key);const inMonth=day.getMonth()===visibleDate.getMonth();return <button type="button" key={key} onClick={()=>{setSelectedDate(key);setVisibleDate(dateFrom(key))}} className={'planner-day'+(key===selectedDate?' selected':'')+(key===today()?' today':'')+(!inMonth&&view==='maand'?' outside':'')}><span className="planner-day-number">{day.getDate()}</span>{items.slice(0,3).map(item=><span key={item.id} className={'planner-day-event kind-'+item.kind.toLowerCase()}>{item.time ? item.time+' ' : ''}{item.title}</span>)}{items.length>3&&<span className="planner-more">+{items.length-3} meer</span>}</button>})}</div>
      <div className="planner-legend"><span><i className="kind-toets"/> Toets</span><span><i className="kind-opdracht"/> Opdracht</span><span><i className="kind-leermoment"/> Leermoment</span></div>
    </section>
    <div className="planner-toolbar"><div><h3>{formatDate(selectedDate)}</h3><p>{selectedItems.length ? selectedItems.length+' agendapunt'+(selectedItems.length===1?'':'en') : 'Nog niets gepland op deze dag.'}</p></div><button className="primary-btn" type="button" onClick={()=>{setForm(emptyForm(selectedDate));setShowForm(value=>!value)}}><Plus size={16}/>{showForm?'Sluiten':'Toevoegen'}</button></div>
    {showForm&&<form className="panel planner-form" onSubmit={addItem}><h3>Nieuw agendapunt</h3><label className="field-label">Wat staat er gepland?<input autoFocus maxLength={100} required placeholder="Bijv. Toets hoofdstuk 3" value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/></label><div className="planner-form-grid"><label className="field-label">Vak<input list="planner-subjects" maxLength={50} required placeholder="Bijv. Biologie" value={form.subject} onChange={e=>setForm({...form,subject:e.target.value})}/><datalist id="planner-subjects">{subjects.map(subject=><option key={subject.name} value={subject.name}/>)}</datalist></label><label className="field-label">Soort<select value={form.kind} onChange={e=>setForm({...form,kind:e.target.value})}><option>Toets</option><option>Opdracht</option><option>Leermoment</option></select></label><label className="field-label">Datum<input type="date" required value={form.date} onChange={e=>setForm({...form,date:e.target.value})}/></label><label className="field-label">Tijd (24 uur)<input type="time" step="300" value={form.time} onChange={e=>setForm({...form,time:e.target.value})}/></label><label className="field-label">Duur (minuten)<input type="number" min="5" max="600" step="5" value={form.minutes} onChange={e=>setForm({...form,minutes:e.target.value})}/></label></div><div className="planner-form-actions"><button className="primary-btn" type="submit"><Plus size={15}/> Opslaan</button><button className="soft-btn" type="button" onClick={()=>{setShowForm(false);setForm(emptyForm(selectedDate))}}>Annuleren</button></div></form>}
    <section className="panel planner-list"><div className="panel-head"><div><span className="panel-kicker">Geselecteerde dag</span><h3><CalendarDays size={16}/> Agenda-items</h3></div><span className="planner-count">{selectedItems.length} items</span></div>{selectedItems.length?selectedItems.map(renderItem):<div className="planner-empty"><CalendarDays size={25}/><strong>Deze dag is nog leeg</strong><span>Klik op ‘Toevoegen’ om iets in te plannen.</span></div>}</section>
    {completed.length>0&&<section className="panel planner-list"><div className="panel-head"><div><span className="panel-kicker">AFGEROND</span><h3><Check size={16}/> Afgeronde agendapunten</h3></div><span className="planner-count">{completed.length} items</span></div>{completed.map(renderItem)}</section>}
  </div>
}
