import { useEffect, useState } from 'react'
import { FileText, ImagePlus, LoaderCircle, Plus, Save, Trash2, Upload, X } from 'lucide-react'
import mammoth from 'mammoth'
import { recognize } from 'tesseract.js'

const STORAGE_KEY = 'leerkompas:vocabularyLists'
const readLists = () => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') } catch { return [] }
}
const cleanLine = value => value.replace(/^\s*(?:[-•*]|\d+[.)])\s*/, '').replace(/\s+/g, ' ').trim()
function detectTerms(text) {
  const lines = text.split(/\r?\n/).map(cleanLine).filter(Boolean)
  const terms = []
  for (const line of lines) {
    const pair = line.match(/^(.{2,65}?)\s*(?::|\s[–—-]\s)\s*(.{2,})$/)
    if (pair) terms.push(pair[1].replace(/[.;,]$/, '').trim())
    else if (line.length <= 65 && !/[.!?]$/.test(line) && !/^pagina\s+\d+/i.test(line)) terms.push(line.replace(/[:;,.]$/, '').trim())
  }
  const seen = new Set()
  return terms.filter(term => {
    const key = term.toLocaleLowerCase('nl-NL')
    if (key.length < 2 || seen.has(key)) return false
    seen.add(key); return true
  }).slice(0, 250)
}

export default function VocabularyBuilder() {
  const [title, setTitle] = useState('')
  const [terms, setTerms] = useState([])
  const [savedLists, setSavedLists] = useState(readLists)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [sourceName, setSourceName] = useState('')
  useEffect(() => {
    const refresh = () => setSavedLists(readLists())
    window.addEventListener('storage', refresh)
    return () => window.removeEventListener('storage', refresh)
  }, [])

  const processFile = async file => {
    if (!file) return
    setBusy(true); setError(''); setStatus('Bestand wordt gelezen…'); setSourceName(file.name)
    try {
      let text = ''
      if (file.name.toLowerCase().endsWith('.docx')) {
        const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() })
        text = result.value
      } else if (file.type.startsWith('image/')) {
        setStatus('Tekst op de foto herkennen…')
        const result = await recognize(file, 'nld+eng')
        text = result.data.text
      } else {
        throw new Error('Kies een .docx-bestand of een foto (JPG, PNG of WEBP).')
      }
      const detected = detectTerms(text)
      setTerms(detected)
      if (!title.trim()) setTitle(file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' '))
      setStatus(detected.length ? detected.length + ' mogelijke begrippen herkend. Controleer de lijst hieronder.' : 'Ik kon geen duidelijke begrippen herkennen. Je kunt ze hieronder zelf toevoegen.')
    } catch (e) {
      setError(e?.message || 'Het bestand kon niet worden gelezen.')
      setStatus('')
    } finally { setBusy(false) }
  }
  const updateTerm = (index, value) => setTerms(current => current.map((term, i) => i === index ? value : term))
  const addTerm = () => setTerms(current => [...current, ''])
  const removeTerm = index => setTerms(current => current.filter((_, i) => i !== index))
  const saveList = () => {
    const clean = [...new Set(terms.map(term => term.trim()).filter(Boolean))]
    if (!clean.length) { setError('Voeg eerst minimaal één begrip toe.'); return }
    const list = { id: crypto.randomUUID(), title: title.trim() || 'Mijn woordenlijst', terms: clean, createdAt: new Date().toISOString() }
    const next = [list, ...readLists()]
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    window.dispatchEvent(new CustomEvent('leerkompas:data-changed'))
    setSavedLists(next); setTerms([]); setTitle(''); setSourceName(''); setStatus('Woordenlijst opgeslagen in je leeromgeving.'); setError('')
  }
  const deleteList = id => {
    const next = savedLists.filter(list => list.id !== id)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    window.dispatchEvent(new CustomEvent('leerkompas:data-changed'))
    setSavedLists(next)
  }

  return <div className="vocabulary-page">
    <header className="vocabulary-heading"><span className="panel-kicker">LEERSTOF · WOORDENLIJST</span><h2>Maak een woordenlijst</h2><p>Upload je lesmateriaal en laat SlimLeren mogelijke begrippen herkennen.</p></header>
    <section className="panel vocabulary-upload">
      <div className="vocabulary-upload-icon"><Upload size={22}/></div>
      <h3>Upload een Word-bestand of foto</h3>
      <p>Ondersteund: DOCX, JPG, PNG en WEBP. De herkende begrippen kun je eerst controleren.</p>
      <label className="primary-btn vocabulary-file-button"><Upload size={16}/> Bestand kiezen<input type="file" accept=".docx,image/jpeg,image/png,image/webp" disabled={busy} onChange={e => processFile(e.target.files?.[0])}/></label>
      {busy&&<p className="vocabulary-status"><LoaderCircle className="spin" size={16}/>{status}</p>}
      {!busy&&status&&<p className="vocabulary-status">{status}</p>}
      {error&&<p className="admin-error">{error}</p>}
    </section>
    {(terms.length>0||sourceName)&&<section className="panel vocabulary-editor">
      <div className="panel-head"><div><span className="panel-kicker">CONTROLEREN</span><h3>{terms.length} herkende begrippen</h3></div><button className="soft-btn" onClick={addTerm}><Plus size={15}/> Begrip toevoegen</button></div>
      <label className="vocabulary-title-field">Naam van de woordenlijst<input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Bijv. Hoofdstuk 2"/></label>
      {sourceName&&<p className="vocabulary-source"><FileText size={14}/>{sourceName}</p>}
      <div className="vocabulary-term-list">{terms.map((term,index)=><div className="vocabulary-term-row" key={index}><span>{index+1}</span><input value={term} onChange={e=>updateTerm(index,e.target.value)} aria-label={'Begrip '+(index+1)} placeholder="Typ een begrip"/><button className="icon-btn" onClick={()=>removeTerm(index)} aria-label="Verwijder begrip"><X size={16}/></button></div>)}</div>
      <button className="primary-btn" onClick={saveList} disabled={!terms.some(term=>term.trim())}><Save size={16}/> Woordenlijst opslaan</button>
    </section>}
    <section className="panel vocabulary-saved">
      <div className="panel-head"><div><span className="panel-kicker">OPGESLAGEN</span><h3>Mijn woordenlijsten</h3></div><span className="vocabulary-count">{savedLists.length}</span></div>
      {savedLists.length===0?<p className="muted">Je hebt nog geen woordenlijsten opgeslagen.</p>:savedLists.map(list=><div className="vocabulary-saved-row" key={list.id}><div><strong>{list.title}</strong><small>{list.terms.length} begrippen</small></div><button className="icon-btn" onClick={()=>deleteList(list.id)} aria-label={'Verwijder '+list.title}><Trash2 size={16}/></button></div>)}
    </section>
  </div>
}
