import { useEffect, useState } from 'react'
import { FileText, LoaderCircle, Plus, Save, Trash2, Upload, X } from 'lucide-react'
import mammoth from 'mammoth'
import { recognize } from 'tesseract.js'

const STORAGE_KEY = 'leerkompas:vocabularyLists'
const readLists = () => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') } catch { return [] }
}
const cleanLine = value => value.replace(/^\s*(?:[-•*]|\d+[.)])\s*/, '').replace(/\s+/g, ' ').trim()
const languageHeading = /^(nederlands|duits|engels|frans|spaans|latijn|italiaans|deutsch|english|français|español|latin|vocabulary|wortschatz|begriffe|begrippen)(?:\s+(?:woorden|vocabulary|wortschatz))?$/i
const chapterHeading = /^(?:lektion|leçon|lesson|les|hoofdstuk|kapitel|chapter|unit|eenheid|paragraaf)\s*\d+[\s:.-]*.*$/i

function detectEntries(text, instruction) {
  const lines = text.split(/\r?\n/).map(cleanLine).filter(Boolean)
  const entries = []
  const wanted = (instruction.match(/(?:lektion|hoofdstuk|kapitel|chapter|lesson|les|unit)\s*\d+/i) || [])[0]?.toLocaleLowerCase('nl-NL')
  let currentSection = ''
  let currentLanguage = ''
  let active = !wanted
  for (const line of lines) {
    if (chapterHeading.test(line)) {
      currentSection = line
      active = !wanted || line.toLocaleLowerCase('nl-NL').includes(wanted)
      continue
    }
    if (languageHeading.test(line)) { currentLanguage = line; continue }
    if (/^\d+$/.test(line) || /^pagina\s+\d+/i.test(line) || line.length > 100) continue
    if (!active) continue
    const pair = line.match(/^(.{1,70}?)\s*(?::|\t|\s[–—-]\s|\s{2,})\s*(.{2,})$/)
    if (pair) {
      const term = pair[1].replace(/[;,.]$/, '').trim()
      const meaning = pair[2].trim()
      if (term && meaning && !languageHeading.test(term) && !chapterHeading.test(term)) entries.push({ term, meaning, section: currentSection, language: currentLanguage })
    } else if (line.length <= 65 && !/[.!?]$/.test(line) && !languageHeading.test(line)) {
      entries.push({ term: line.replace(/[:;,.]$/, ''), meaning: '', section: currentSection, language: currentLanguage })
    }
  }
  const seen = new Set()
  return entries.filter(entry => {
    const key = entry.term.toLocaleLowerCase('nl-NL')+'|'+(entry.language||'').toLocaleLowerCase('nl-NL')
    if (key.length < 2 || seen.has(key)) return false
    seen.add(key); return true
  }).slice(0, 250)
}

export default function VocabularyBuilder() {
  const [title, setTitle] = useState('')
  const [instruction, setInstruction] = useState('')
  const [entries, setEntries] = useState([])
  const [savedLists, setSavedLists] = useState(readLists)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [sourceName, setSourceName] = useState('')
  useEffect(() => {
    const refresh = () => setSavedLists(readLists())
    window.addEventListener('leerkompas:data-changed', refresh)
    return () => window.removeEventListener('leerkompas:data-changed', refresh)
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
      } else throw new Error('Kies een .docx-bestand of een foto (JPG, PNG of WEBP).')
      const detected = detectEntries(text, instruction)
      setEntries(detected)
      if (!title.trim()) setTitle(file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' '))
      setStatus(detected.length ? detected.length + ' mogelijke begrippen met betekenis herkend. Controleer ze hieronder.' : 'Geen duidelijke begrippen gevonden. Pas je opdracht aan of voeg ze zelf toe.')
    } catch (e) {
      setError(e?.message || 'Het bestand kon niet worden gelezen.')
      setStatus('')
    } finally { setBusy(false) }
  }
  const updateEntry = (index, key, value) => setEntries(current => current.map((entry, i) => i === index ? { ...entry, [key]: value } : entry))
  const addEntry = () => setEntries(current => [...current, { term: '', meaning: '', section: '' }])
  const removeEntry = index => setEntries(current => current.filter((_, i) => i !== index))
  const saveList = () => {
    const clean = entries.map(entry => ({ term: entry.term.trim(), meaning: entry.meaning.trim(), language: entry.language || '', section: entry.section || '' })).filter(entry => entry.term)
    const unique = clean.filter((entry,index) => clean.findIndex(other=>other.term.toLocaleLowerCase('nl-NL')===entry.term.toLocaleLowerCase('nl-NL') && other.language===entry.language)===index)
    if (!unique.length) { setError('Voeg eerst minimaal één begrip toe.'); return }
    const list = { id: crypto.randomUUID(), title: title.trim() || 'Mijn woordenlijst', entries: unique, terms: unique.map(entry=>entry.term), createdAt: new Date().toISOString() }
    const next = [list, ...readLists()]
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    window.dispatchEvent(new CustomEvent('leerkompas:data-changed'))
    setSavedLists(next); setEntries([]); setTitle(''); setSourceName(''); setStatus('Woordenlijst opgeslagen in je leeromgeving.'); setError('')
  }
  const deleteList = id => {
    const next = savedLists.filter(list => list.id !== id)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    window.dispatchEvent(new CustomEvent('leerkompas:data-changed'))
    setSavedLists(next)
  }
  const listEntries = list => list.entries || (list.terms || []).map(term => typeof term === 'string' ? {term,meaning:''} : term)

  return <div className="vocabulary-page">
    <header className="vocabulary-heading"><span className="panel-kicker">LEERSTOF · WOORDENLIJST</span><h2>Maak een woordenlijst</h2><p>Herken woorden en betekenissen uit je lesmateriaal. Controleer het resultaat voordat je opslaat.</p></header>
    <section className="panel vocabulary-upload">
      <div className="vocabulary-upload-icon"><Upload size={22}/></div>
      <h3>Upload een Word-bestand of foto</h3>
      <p>Ondersteund: DOCX, JPG, PNG en WEBP. Taalnamen en hoofdstukkoppen worden zo veel mogelijk overgeslagen.</p>
      <label className="vocabulary-title-field">Extra opdracht (optioneel)<input value={instruction} onChange={e=>setInstruction(e.target.value)} placeholder="Bijv. doe alleen de woorden van Lektion 2"/></label>
      <label className="primary-btn vocabulary-file-button"><Upload size={16}/> Bestand kiezen<input type="file" accept=".docx,image/jpeg,image/png,image/webp" disabled={busy} onChange={e => processFile(e.target.files?.[0])}/></label>
      {busy&&<p className="vocabulary-status"><LoaderCircle className="spin" size={16}/>{status}</p>}
      {!busy&&status&&<p className="vocabulary-status">{status}</p>}
      {error&&<p className="admin-error">{error}</p>}
    </section>
    {(entries.length>0||sourceName)&&<section className="panel vocabulary-editor">
      <div className="panel-head"><div><span className="panel-kicker">CONTROLEREN</span><h3>{entries.length} herkende regels</h3></div><button className="soft-btn" onClick={addEntry}><Plus size={15}/> Begrip toevoegen</button></div>
      <label className="vocabulary-title-field">Naam van de woordenlijst<input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Bijv. Duits · Lektion 2"/></label>
      {sourceName&&<p className="vocabulary-source"><FileText size={14}/>{sourceName}</p>}
      <div className="vocabulary-term-list">{entries.map((entry,index)=><div className="vocabulary-entry-row" key={index}><span>{index+1}</span><input value={entry.term} onChange={e=>updateEntry(index,'term',e.target.value)} aria-label={'Begrip '+(index+1)} placeholder="Begrip of woord"/><input value={entry.meaning} onChange={e=>updateEntry(index,'meaning',e.target.value)} aria-label={'Betekenis '+(index+1)} placeholder="Betekenis / vertaling"/><button className="icon-btn" onClick={()=>removeEntry(index)} aria-label="Verwijder begrip"><X size={16}/></button></div>)}</div>
      <button className="primary-btn" onClick={saveList} disabled={!entries.some(entry=>entry.term.trim())}><Save size={16}/> Woordenlijst opslaan</button>
    </section>}
    <section className="panel vocabulary-saved">
      <div className="panel-head"><div><span className="panel-kicker">OPGESLAGEN</span><h3>Mijn woordenlijsten</h3></div><span className="vocabulary-count">{savedLists.length}</span></div>
      {savedLists.length===0?<p className="muted">Je hebt nog geen woordenlijsten opgeslagen.</p>:savedLists.map(list=><details className="vocabulary-saved-item" key={list.id}><summary><span><strong>{list.title}</strong><small>{listEntries(list).length} begrippen</small></span><button type="button" className="icon-btn" onClick={e=>{e.preventDefault();deleteList(list.id)}} aria-label={'Verwijder '+list.title}><Trash2 size={16}/></button></summary><ul>{listEntries(list).map((entry,index)=><li key={index}><strong>{entry.term}</strong>{entry.meaning?' — '+entry.meaning:''}{entry.language?' ('+entry.language+')':''}</li>)}</ul></details>)}
    </section>
  </div>
}
