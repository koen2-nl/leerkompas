import { useMemo, useState } from 'react'
import { CalendarDays, Check, Plus, Trash2 } from 'lucide-react'

const today = () => {
  const date = new Date()
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 10)
}
const emptyForm = () => ({ title: '', subject: '', kind: 'Toets', date: today(), time: '09:00', minutes: '30' })

export default function Planning({ planning, setPlanning, subjects }) {
  const [form, setForm] = useState(emptyForm)
  const [showForm, setShowForm] = useState(false)
  const sorted = useMemo(() => [...planning].sort((a, b) => a.date.localeCompare(b.date) || (a.time || '').localeCompare(b.time || '')), [planning])
  const openItems = sorted.filter(item => !item.done)
  const completed = sorted.filter(item => item.done)
  const addItem = event => {
    event.preventDefault()
    if (!form.title.trim() || !form.subject.trim() || !form.date) return
    setPlanning(items => [...items, { ...form, id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7), title: form.title.trim(), subject: form.subject.trim(), minutes: Math.max(5, Math.min(600, Number(form.minutes) || 30)), done: false, createdAt: new Date().toISOString() }])
    setForm(emptyForm())
    setShowForm(false)
  }
  const toggle = id => setPlanning(items => items.map(item => item.id === id ? { ...item, done: !item.done } : item))
  const remove = id => setPlanning(items => items.filter(item => item.id !== id))
  const formatDate = value => new Date(value + 'T12:00:00').toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' })
  const renderItem = item => <article className={'planner-item' + (item.done ? ' is-done' : '')} key={item.id}>
    <button className="planner-check" type="button" onClick={() => toggle(item.id)} aria-label={item.done ? 'Markeer als niet afgerond' : 'Markeer als afgerond'}>{item.done && <Check size={15}/>}</button>
    <div className="planner-item-main"><div className="planner-item-meta"><span className={'planner-kind kind-' + item.kind.toLowerCase()}>{item.kind}</span><span>{formatDate(item.date)} · {item.time || 'Hele dag'}</span></div><strong>{item.title}</strong><small>{item.subject} · {item.minutes} min</small></div>
    <button className="planner-delete" type="button" onClick={() => remove(item.id)} aria-label="Verwijder planning"><Trash2 size={16}/></button>
  </article>
  return <div className="planner-page">
    <section className="planner-intro panel"><div><span className="panel-kicker">JOUW AGENDA</span><h2>Wat staat er op de planning?</h2><p>Voeg toetsen, opdrachten en leermomenten toe. Je planning wordt automatisch bij je account bewaard.</p></div><div className="planner-summary"><strong>{openItems.length}</strong><span>open gepland</span><small>{completed.length} afgerond</small></div></section>
    <div className="planner-toolbar"><div><h3>Mijn planning</h3><p>Alles wat jij zelf wilt onthouden voor school.</p></div><button className="primary-btn" type="button" onClick={() => setShowForm(value => !value)}><Plus size={16}/>{showForm ? 'Sluiten' : 'Item toevoegen'}</button></div>
    {showForm && <form className="panel planner-form" onSubmit={addItem}>
      <h3>Nieuw item</h3>
      <label className="field-label">Wat moet je doen?<input autoFocus maxLength={100} required placeholder="Bijv. Hoofdstuk 3 leren" value={form.title} onChange={e => setForm({...form, title:e.target.value})}/></label>
      <div className="planner-form-grid">
        <label className="field-label">Vak<input list="planner-subjects" maxLength={50} required placeholder="Bijv. Biologie" value={form.subject} onChange={e => setForm({...form, subject:e.target.value})}/><datalist id="planner-subjects">{subjects.map(subject => <option key={subject.name} value={subject.name}/>)}</datalist></label>
        <label className="field-label">Soort<select value={form.kind} onChange={e => setForm({...form, kind:e.target.value})}><option>Toets</option><option>Opdracht</option><option>Leermoment</option></select></label>
        <label className="field-label">Datum<input type="date" required value={form.date} onChange={e => setForm({...form, date:e.target.value})}/></label>
        <label className="field-label">Tijd<input type="time" value={form.time} onChange={e => setForm({...form, time:e.target.value})}/></label>
        <label className="field-label">Tijdsduur (minuten)<input type="number" min="5" max="600" step="5" value={form.minutes} onChange={e => setForm({...form, minutes:e.target.value})}/></label>
      </div>
      <div className="planner-form-actions"><button className="primary-btn" type="submit"><Plus size={15}/> Opslaan</button><button className="soft-btn" type="button" onClick={() => {setShowForm(false);setForm(emptyForm())}}>Annuleren</button></div>
    </form>}
    <section className="panel planner-list"><div className="panel-head"><div><span className="panel-kicker">TO DO</span><h3><CalendarDays size={16}/> Aankomend en gepland</h3></div><span className="planner-count">{openItems.length} items</span></div>
      {openItems.length ? openItems.map(renderItem) : <div className="planner-empty"><CalendarDays size={25}/><strong>Nog niets gepland</strong><span>Voeg hierboven je eerste toets of leermoment toe.</span></div>}
    </section>
    {completed.length > 0 && <section className="panel planner-list"><div className="panel-head"><div><span className="panel-kicker">AFGEROND</span><h3><Check size={16}/> Klaar</h3></div><span className="planner-count">{completed.length} items</span></div>{completed.map(renderItem)}</section>}
  </div>
}
