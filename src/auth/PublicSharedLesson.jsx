import { useEffect, useState } from 'react'
import { supabase } from './supabase.js'
import { Compass, LoaderCircle } from 'lucide-react'

export default function PublicSharedLesson({ token }) {
  const [lesson,setLesson]=useState(null)
  const [loading,setLoading]=useState(true)
  const [error,setError]=useState('')
  useEffect(()=>{
    let active=true
    supabase.rpc('get_shared_lesson',{p_share_token:token}).then(({data,error})=>{
      if(!active)return
      if(error)setError(error.message)
      else setLesson(data?.[0]||null)
      setLoading(false)
    })
    return()=>{active=false}
  },[token])
  return <main className="public-shared-page"><header><Compass size={25}/> <strong>Leervo</strong></header><section className="panel public-shared-card">{loading?<p><LoaderCircle className="spin"/> Les wordt geladen…</p>:error?<p>{error}</p>:!lesson?<p>Deze deellink is niet geldig of de les is niet meer beschikbaar.</p>:<><span className="panel-kicker">GEDEELDE LES</span><h1>{lesson.title}</h1><p>{lesson.description}</p>{(lesson.content?.sections||[]).map((section,index)=><article key={index}><h2>{section.title}</h2>{section.explanation&&<p>{section.explanation}</p>}{(section.questions||[]).map((question,qIndex)=><div className="public-shared-question" key={qIndex}><strong>{qIndex+1}. {question.q||question.question}</strong>{question.options?.length>0&&<ul>{question.options.map((option,k)=><li key={k}>{option}</li>)}</ul>}</div>)}</article>)}</>}</section></main>
}
