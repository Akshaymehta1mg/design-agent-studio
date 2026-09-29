import { useCallback, useEffect, useRef, useState } from "react"

/* Minimal typing for the Web Speech API (Chrome, Edge, Safari). */
export interface SpeechRec {
  continuous: boolean
  interimResults: boolean
  lang: string
  start(): void
  stop(): void
  abort(): void
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null
  onend: (() => void) | null
  onerror: ((e: { error: string }) => void) | null
}

export function getSpeechRecognition(): (new () => SpeechRec) | null {
  const w = window as unknown as { SpeechRecognition?: new () => SpeechRec; webkitSpeechRecognition?: new () => SpeechRec }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

/** Push-to-talk dictation into a text field. */
export function useDictation(onText: (finalText: string, interim: string) => void) {
  const [listening, setListening] = useState(false)
  const rec = useRef<SpeechRec | null>(null)
  const cb = useRef(onText)
  cb.current = onText
  const supported = typeof window !== "undefined" && !!getSpeechRecognition()

  const stop = useCallback(() => {
    rec.current?.stop()
    setListening(false)
  }, [])

  const start = useCallback(() => {
    const SR = getSpeechRecognition()
    if (!SR) return false
    const r = new SR()
    r.continuous = true
    r.interimResults = true
    r.lang = navigator.language || "en-US"
    let finalText = ""
    r.onresult = (e) => {
      let interim = ""
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i]
        if (res.isFinal) finalText += res[0].transcript
        else interim += res[0].transcript
      }
      cb.current(finalText, interim)
    }
    r.onend = () => setListening(false)
    r.onerror = () => setListening(false)
    try {
      r.start()
      rec.current = r
      setListening(true)
      return true
    } catch {
      return false
    }
  }, [])

  useEffect(() => () => rec.current?.abort(), [])
  return { listening, start, stop, supported }
}
