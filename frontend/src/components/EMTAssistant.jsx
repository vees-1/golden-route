import React, { useState, useEffect, useRef } from 'react'
import { Mic, MicOff, X } from 'lucide-react'

const GREETING = 'ARIA online. Report patient status.'

export default function EMTAssistant({ onVitalsExtracted }) {
  const [expanded, setExpanded] = useState(false)
  const [messages, setMessages] = useState([{ role: 'assistant', content: GREETING }])
  const [listening, setListening] = useState(false)
  const [interim, setInterim] = useState('')
  const [loading, setLoading] = useState(false)
  const recognitionRef = useRef(null)
  const bottomRef = useRef(null)
  const mutedRef = useRef(false)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, interim])

  function speak(text) {
    if (mutedRef.current) return
    window.speechSynthesis.cancel()
    const utt = new SpeechSynthesisUtterance(text)
    utt.rate = 1.05
    const voices = window.speechSynthesis.getVoices()
    const pick = voices.find((v) => v.lang.startsWith('en') && /samantha|karen|victoria|moira|zira/i.test(v.name))
    if (pick) utt.voice = pick
    window.speechSynthesis.speak(utt)
  }

  async function send(msgs) {
    setLoading(true)
    try {
      const res = await fetch('http://localhost:8000/emt-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: msgs }),
      })
      const data = await res.json()
      setMessages((p) => [...p, { role: 'assistant', content: data.message }])
      speak(data.message)
      if (data.extracted_vitals) onVitalsExtracted?.(data.extracted_vitals)
    } catch {
      setMessages((p) => [...p, { role: 'assistant', content: 'Connection lost.' }])
    } finally {
      setLoading(false)
    }
  }

  function startListening() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) return
    const r = new SR()
    r.continuous = true
    r.interimResults = true
    r.lang = 'en-US'
    recognitionRef.current = r
    let final = ''
    r.onresult = (e) => {
      let interim = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        e.results[i].isFinal ? (final += e.results[i][0].transcript + ' ') : (interim += e.results[i][0].transcript)
      }
      setInterim(interim)
    }
    r.onend = () => {
      setListening(false)
      setInterim('')
      const text = final.trim()
      if (!text) return
      const userMsg = { role: 'user', content: text }
      setMessages((prev) => {
        const updated = [...prev, userMsg]
        send(updated.filter((m) => !(m.role === 'assistant' && m.content === GREETING)))
        return updated
      })
    }
    r.start()
    setListening(true)
  }

  function stopListening() { recognitionRef.current?.stop() }

  function clear() {
    window.speechSynthesis.cancel()
    recognitionRef.current?.stop()
    setMessages([{ role: 'assistant', content: GREETING }])
    setInterim('')
    setListening(false)
  }

  if (!expanded) {
    return (
      <div className="flex justify-center py-3">
        <button
          type="button"
          onClick={() => setExpanded(true)}
          title="ARIA — EMT Co-pilot"
          style={{
            width: 44, height: 44, borderRadius: '50%',
            background: '#1C1C1E', border: 'none', cursor: 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
            boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
          }}
        >
          <Mic size={16} color="white" />
          <span style={{ fontSize: 7, fontWeight: 700, color: 'rgba(255,255,255,0.6)', letterSpacing: '0.06em' }}>ARIA</span>
        </button>
      </div>
    )
  }

  return (
    <div className="rounded-xl overflow-hidden flex flex-col mt-2"
      style={{ border: '1px solid #E5E5EA', background: 'white' }}>

      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2" style={{ background: '#1C1C1E' }}>
        <div className="flex items-center gap-2">
          <Mic size={12} color="white" />
          <span className="text-xs font-semibold" style={{ color: 'white' }}>ARIA</span>
          {listening && <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#34C759' }} />}
        </div>
        <div className="flex gap-1">
          <button type="button" onClick={clear}
            className="text-xs px-2 py-0.5 rounded"
            style={{ color: 'rgba(255,255,255,0.4)', background: 'transparent', border: 'none', cursor: 'pointer' }}>
            clear
          </button>
          <button type="button" onClick={() => setExpanded(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)' }}>
            <X size={13} />
          </button>
        </div>
      </div>

      {/* Chat */}
      <div className="flex flex-col gap-2 p-3 overflow-y-auto" style={{ minHeight: 160, maxHeight: 220, background: '#FAFAFA' }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div className="text-xs rounded-xl px-2.5 py-1.5"
              style={{
                maxWidth: '88%', lineHeight: 1.5,
                background: m.role === 'user' ? '#1C1C1E' : 'white',
                color: m.role === 'user' ? 'white' : '#1D1D1F',
                border: m.role === 'assistant' ? '1px solid #E5E5EA' : 'none',
              }}>
              {m.content}
            </div>
          </div>
        ))}
        {interim && (
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <div className="text-xs rounded-xl px-2.5 py-1.5 italic" style={{ color: '#86868B', background: '#F2F2F7' }}>{interim}</div>
          </div>
        )}
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div className="text-xs rounded-xl px-2.5 py-1.5" style={{ background: 'white', color: '#86868B', border: '1px solid #E5E5EA' }}>···</div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Mic */}
      <div className="flex justify-center px-3 py-2" style={{ borderTop: '1px solid #F2F2F7' }}>
        <button type="button" onClick={listening ? stopListening : startListening} disabled={loading}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium"
          style={{
            background: listening ? '#FF3B30' : '#1C1C1E',
            color: 'white', border: 'none', cursor: loading ? 'default' : 'pointer',
            opacity: loading ? 0.5 : 1,
          }}>
          {listening ? <><MicOff size={12} /> Stop</> : <><Mic size={12} /> {loading ? '···' : 'Speak'}</>}
        </button>
      </div>
    </div>
  )
}
