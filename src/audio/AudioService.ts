import { Howl, Howler } from 'howler'
import { getClip, type AudioClip } from '@/audio/AudioManifest'

const SAFETY_TIMEOUT_MS = 15000
const SPEECH_SUPPORTED = typeof window !== 'undefined' && 'speechSynthesis' in window

/**
 * AudioService — plays Dutch narration, choice prompts, sfx and ambient beds.
 *
 * During development no recorded audio files exist yet, so clips with `text`
 * fall back to browser Text-To-Speech using an `nl-NL` voice. Recorded files
 * get swapped in later purely via the manifest, with no code changes here.
 */
export class AudioService {
  private unlocked = false
  private warnedClips = new Set<string>()

  // Cached Dutch voice for TTS (voices load asynchronously).
  private dutchVoice: SpeechSynthesisVoice | null = null
  private voicesBound = false

  // Loaded Howl instances by clipId (for file-backed clips).
  private howls = new Map<string, Howl>()

  // The single currently-playing narration/prompt utterance + Howl.
  private currentUtterance: SpeechSynthesisUtterance | null = null
  private currentHowl: Howl | null = null
  private currentResolve: (() => void) | null = null
  private currentTimeout: ReturnType<typeof setTimeout> | null = null

  // Ambient bed lives on its own Howl so narration never stops it.
  private ambientHowl: Howl | null = null
  private ambientId: string | null = null

  constructor() {
    this.bindVoices()
  }

  // ---- Unlock / lifecycle -------------------------------------------------

  /**
   * Call on the first user tap: resume the AudioContext, prime Howler and warm
   * speechSynthesis (speak a blank utterance) so iOS/tablets allow audio + TTS
   * afterwards. Idempotent.
   */
  async unlock(): Promise<void> {
    if (this.unlocked) return
    this.unlocked = true

    // Resume / prime Howler's AudioContext (created lazily by howler).
    try {
      const ctx = Howler.ctx as AudioContext | undefined
      if (ctx && ctx.state === 'suspended') {
        await ctx.resume()
      }
    } catch {
      /* ignore — audio may still work */
    }

    // Warm speechSynthesis so the first real utterance isn't swallowed.
    if (SPEECH_SUPPORTED) {
      try {
        this.bindVoices()
        const warm = new SpeechSynthesisUtterance(' ')
        warm.volume = 0
        warm.lang = 'nl-NL'
        window.speechSynthesis.speak(warm)
      } catch {
        /* ignore */
      }
    }
  }

  isUnlocked(): boolean {
    return this.unlocked
  }

  // ---- Public playback API ------------------------------------------------

  /** Play Dutch narration; resolves when finished (or immediately if interrupted/unknown). */
  narrate(clipId: string): Promise<void> {
    return this.playClip(clipId)
  }

  /** Like narrate, for short choice prompts (tap-to-hear). */
  prompt(clipId: string): Promise<void> {
    return this.playClip(clipId)
  }

  /** Speak arbitrary Dutch text directly via nl-NL TTS (for dynamic UI labels). */
  speak(textNl: string): Promise<void> {
    this.stopNarration()
    return this.speakText(textNl)
  }

  /** Fire-and-forget short effect; no-op if no file. */
  sfx(id: string): void {
    const clip = getClip(id)
    if (!clip) {
      this.warnUnknown(id)
      return
    }
    if (!clip.file) return // no recorded sfx yet → silent no-op
    try {
      const howl = this.getHowl(id, clip)
      howl.play()
    } catch {
      /* never throw on a missing/broken effect */
    }
  }

  /** Start / cross-switch the looping ambient bed; null stops it. No-op-safe if no file. */
  ambient(clipId: string | null): void {
    if (clipId === null) {
      this.stopAmbient()
      return
    }
    if (this.ambientId === clipId && this.ambientHowl) return

    const clip = getClip(clipId)
    if (!clip) {
      this.warnUnknown(clipId)
      return
    }

    // Stop previous bed regardless of whether the new one has a file.
    this.stopAmbient()
    this.ambientId = clipId

    if (!clip.file) return // silent placeholder until a recorded bed exists

    try {
      const howl = new Howl({
        src: [clip.file],
        loop: true,
        volume: clip.volume ?? 0.4,
        html5: true,
        onloaderror: () => {
          /* missing file → silent */
        },
        onplayerror: function (this: Howl) {
          // Autoplay/lock issue: retry once after unlock event.
          this.once('unlock', () => this.play())
        },
      })
      this.ambientHowl = howl
      howl.play()
    } catch {
      this.ambientHowl = null
    }
  }

  // ---- Stop controls ------------------------------------------------------

  stopNarration(): void {
    if (this.currentTimeout) {
      clearTimeout(this.currentTimeout)
      this.currentTimeout = null
    }

    if (SPEECH_SUPPORTED) {
      try {
        window.speechSynthesis.cancel()
      } catch {
        /* ignore */
      }
    }
    this.currentUtterance = null

    if (this.currentHowl) {
      try {
        this.currentHowl.stop()
      } catch {
        /* ignore */
      }
      this.currentHowl = null
    }

    // Resolve any pending narration promise so callers never hang.
    const resolve = this.currentResolve
    this.currentResolve = null
    if (resolve) resolve()
  }

  stopAll(): void {
    this.stopNarration()
    this.stopAmbient()
  }

  // ---- Internals ----------------------------------------------------------

  private playClip(clipId: string): Promise<void> {
    const clip = getClip(clipId)
    if (!clip) {
      this.warnUnknown(clipId)
      return Promise.resolve()
    }

    // Never stack voices: cancel anything in progress first.
    this.stopNarration()

    if (clip.file) {
      return this.playFile(clipId, clip)
    }
    if (clip.text) {
      return this.speakText(clip.text, clip.volume)
    }
    return Promise.resolve()
  }

  private playFile(clipId: string, clip: AudioClip): Promise<void> {
    return new Promise<void>((resolve) => {
      let settled = false
      const done = () => {
        if (settled) return
        settled = true
        if (this.currentTimeout) {
          clearTimeout(this.currentTimeout)
          this.currentTimeout = null
        }
        if (this.currentHowl === howl) {
          this.currentHowl = null
          this.currentResolve = null
        }
        resolve()
      }

      let howl: Howl
      try {
        howl = this.getHowl(clipId, clip)
      } catch {
        resolve()
        return
      }

      this.currentHowl = howl
      this.currentResolve = done

      howl.once('end', done)
      howl.once('loaderror', done)
      howl.once('playerror', done)

      this.currentTimeout = setTimeout(done, SAFETY_TIMEOUT_MS)

      try {
        howl.play()
      } catch {
        done()
      }
    })
  }

  private speakText(text: string, volume?: number): Promise<void> {
    if (!SPEECH_SUPPORTED || !text.trim()) {
      return Promise.resolve()
    }

    return new Promise<void>((resolve) => {
      let settled = false
      const done = () => {
        if (settled) return
        settled = true
        if (this.currentTimeout) {
          clearTimeout(this.currentTimeout)
          this.currentTimeout = null
        }
        if (this.currentUtterance === utterance) {
          this.currentUtterance = null
          this.currentResolve = null
        }
        resolve()
      }

      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = 'nl-NL'
      utterance.rate = 0.95 // slightly slower for pre-readers
      utterance.pitch = 1.1 // friendly
      if (typeof volume === 'number') utterance.volume = volume
      if (this.dutchVoice) utterance.voice = this.dutchVoice

      utterance.onend = done
      utterance.onerror = done

      this.currentUtterance = utterance
      this.currentResolve = done

      // Safety timeout: estimate ~12 chars/sec, with generous floor/ceiling.
      const estMs = Math.min(
        SAFETY_TIMEOUT_MS * 2,
        Math.max(4000, (text.length / 12) * 1000 + 3000),
      )
      this.currentTimeout = setTimeout(done, estMs)

      try {
        window.speechSynthesis.cancel() // ensure clean slate
        window.speechSynthesis.speak(utterance)
      } catch {
        done()
      }
    })
  }

  private getHowl(clipId: string, clip: AudioClip): Howl {
    let howl = this.howls.get(clipId)
    if (!howl) {
      howl = new Howl({
        src: [clip.file as string],
        loop: !!clip.loop,
        volume: clip.volume ?? 1,
      })
      this.howls.set(clipId, howl)
    }
    return howl
  }

  private stopAmbient(): void {
    if (this.ambientHowl) {
      try {
        this.ambientHowl.stop()
        this.ambientHowl.unload()
      } catch {
        /* ignore */
      }
      this.ambientHowl = null
    }
    this.ambientId = null
  }

  private bindVoices(): void {
    if (!SPEECH_SUPPORTED) return
    this.pickDutchVoice()
    if (this.voicesBound) return
    this.voicesBound = true
    try {
      window.speechSynthesis.onvoiceschanged = () => this.pickDutchVoice()
    } catch {
      /* ignore */
    }
  }

  private pickDutchVoice(): void {
    if (!SPEECH_SUPPORTED) return
    try {
      const voices = window.speechSynthesis.getVoices()
      const nl =
        voices.find((v) => v.lang === 'nl-NL') ??
        voices.find((v) => v.lang.toLowerCase().startsWith('nl'))
      if (nl) this.dutchVoice = nl
    } catch {
      /* ignore */
    }
  }

  private warnUnknown(id: string): void {
    if (this.warnedClips.has(id)) return
    this.warnedClips.add(id)
    console.warn(`[AudioService] Unknown audio clip id: "${id}"`)
  }
}
