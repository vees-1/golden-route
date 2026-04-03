import React, { useState, useEffect, useRef } from 'react'
import { Mic, MicOff, Volume2, VolumeX, Trash2 } from 'lucide-react'

const ARIA_GREETING = 'ARIA online. Report patient status.'

export default function EMTAssistant({ onVitalsExtracted }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: ARIA_GREETING },
  ])
  const [listening, setListening] = useState(false)
  const [interim, setInterim] = useState('')
  const [muted, setMuted] = useState(false)
  const [loading, setLoading] = useState(false)

  const recognitionRef = useRef(null)
  const chatBottomRef = useRef(null)
  const mutedRef = useRef(false)

  mutedRef.current = muted

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, interim])

  function buildRecognition() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) return null
    const r = new SR()
    r.continuous = true
    r.interimResults = true
    r.lang = 'en-US'
    return r
  }

  function speak(text) {
    if (mutedRef.current) return
    window.speechSynthesis.cancel()
    const utt = new SpeechSynthesisUtterance(text)
    utt.rate = 1.05
    utt.pitch = 1.0
    const voices = window.speechSynthesis.getVoices()
    const female = voices.find(
      (v) =>
        v.lang.startsWith('en') &&
        (v.name.toLowerCase().includes('female') ||
          v.name.toLowerCase().includes('samantha') ||
          v.name.toLowerCase().includes('karen') ||
          v.name.toLowerCase().includes('victoria') ||
          v.name.toLowerCase().includes('moira') ||
          v.name.toLowerCase().includes('zira'))
    )
    if (female) utt.voice = female
    window.speechSynthesis.speak(utt)
  }

  async function sendToARIA(newMessages) {
    setLoading(true)
    try {
      const res = await fetch('http://localhost:8000/emt-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      })
      if (!res.ok) throw new Error('API error')
      const data = await res.json()

      const ariaMsg = { role: 'assistant', content: data.message }
      setMessages((prev) => [...prev, ariaMsg])
      speak(data.message)

      if (data.extracted_vitals && onVitalsExtracted) {
        onVitalsExtracted(data.extracted_vitals)
      }
    } catch (e) {
      const errMsg = { role: 'assistant', content: 'Signal lost. Retry.' }
      setMessages((prev) => [...prev, errMsg])
    } finally {
      setLoading(false)
    }
  }

  function startListening() {
    const r = buildRecognition()
    if (!r) return
    recognitionRef.current = r

    let finalTranscript = ''

    r.onresult = (e) => {
      let interimText = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript
        if (e.results[i].isFinal) {
          finalTranscript += t + ' '
        } else {
          interimText += t
        }
      }
      setInterim(interimText)
    }

    r.onend = () => {
      setListening(false)
      setInterim('')
      const text = finalTranscript.trim()
      if (!text) return

      const userMsg = { role: 'user', content: text }
      setMessages((prev) => {
        const updated = [...prev, userMsg]
        const apiMessages = updated.filter((m) => m.role !== 'assistant' || m.content !== ARIA_GREETING)
        sendToARIA(apiMessages)
        return updated
      })
    }

    r.start()
    setListening(true)
  }

  function stopListening() {
    recognitionRef.current?.stop()
  }

  function handleMicClick() {
    if (listening) {
      stopListening()
    } else {
      startListening()
    }
  }

  function handleClear() {
    window.speechSynthesis.cancel()
    setMessages([{ role: 'assistant', content: ARIA_GREETING }])
    setInterim('')
    setListening(false)
    recognitionRef.current?.stop()
  }

  return (
    <div className="rounded-2xl overflow-hidden flex flex-col"
      style={{ border: '1px solid rgba(0,0,0,0.1)', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', marginTop: 12 }}>

      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2"
        style={{ background: 'linear-gradient(135deg, #1C1C1E, #2C2C2E)' }}>
        <div className="flex items-center gap-2">
          <span style={{ fontSize: 13 }}>🎙</span>
          <span className="text-xs font-bold" style={{ color: 'white', letterSpacing: '0.02em' }}>
            ARIA — EMT Co-pilot
          </span>
          {listening && (
            <span className="w-2 h-2 rounded-full"
              style={{ background: '#34C759', boxShadow: '0 0 6px #34C759', animation: 'pulse 1s ease-in-out infinite' }} />
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setMuted((m) => !m)}
            className="p-1 rounded-lg transition-all"
            style={{ color: muted ? '#636366' : '#34C759', background: 'rgba(255,255,255,0.08)' }}
            title={muted ? 'Unmute ARIA' : 'Mute ARIA'}
          >
            {muted ? <VolumeX size={13} /> : <Volume2 size={13} />}
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="p-1 rounded-lg transition-all"
            style={{ color: '#FF3B30', background: 'rgba(255,255,255,0.08)' }}
            title="Clear conversation"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Chat area */}
      <div className="flex flex-col gap-2 p-3 overflow-y-auto"
        style={{ background: '#FAFAFA', minHeight: 180, maxHeight: 260 }}>
        {messages.map((msg, i) => (
          <div key={i} className="flex" style={{ justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div className="text-xs rounded-2xl px-3 py-2"
              style={{
                maxWidth: '85%',
                background: msg.role === 'user' ? '#007AFF' : 'white',
                color: msg.role === 'user' ? 'white' : '#1D1D1F',
                border: msg.role === 'assistant' ? '1px solid rgba(0,0,0,0.08)' : 'none',
                lineHeight: 1.5,
                boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
              }}>
              {msg.content}
            </div>
          </div>
        ))}

        {interim && (
          <div className="flex justify-end">
            <div className="text-xs rounded-2xl px-3 py-2 italic"
              style={{ maxWidth: '85%', background: 'rgba(0,122,255,0.12)', color: '#86868B', border: '1px dashed rgba(0,122,255,0.3)' }}>
              {interim}
            </div>
          </div>
        )}

        {loading && (
          <div className="flex justify-start">
            <div className="text-xs rounded-2xl px-3 py-2"
              style={{ background: 'white', color: '#86868B', border: '1px solid rgba(0,0,0,0.08)' }}>
              <span style={{ letterSpacing: '0.1em' }}>···</span>
            </div>
          </div>
        )}

        <div ref={chatBottomRef} />
      </div>

      {/* Mic button */}
      <div className="flex items-center justify-center px-3 py-2.5"
        style={{ background: '#F5F5F7', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
        <button
          type="button"
          onClick={handleMicClick}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all"
          style={{
            background: listening
              ? 'linear-gradient(135deg, #FF3B30, #FF6B6B)'
              : loading
              ? '#E5E5EA'
              : 'linear-gradient(135deg, #1C1C1E, #3A3A3C)',
            color: loading ? '#86868B' : 'white',
            boxShadow: listening ? '0 0 12px rgba(255,59,48,0.4)' : '0 2px 8px rgba(0,0,0,0.15)',
          }}
        >
          {listening ? (
            <><MicOff size={13} /> Stop</>
          ) : (
            <><Mic size={13} /> {loading ? 'Thinking…' : 'Speak'}</>
          )}
        </button>
      </div>
    </div>
  )
}
