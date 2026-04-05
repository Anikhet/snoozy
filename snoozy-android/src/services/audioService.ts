import {
  setAudioModeAsync,
  createAudioPlayer,
  type AudioStatus,
} from 'expo-audio'

type AudioPlayer = ReturnType<typeof createAudioPlayer>

type AudioStateListener = (state: {
  isPlaying: boolean
  currentTime: number
  duration: number
}) => void

type SleepTimerListener = (remaining: number | null) => void

/**
 * Module-level audio service managing playback, progress, and sleep timer.
 * Uses expo-audio (SDK 55+) createAudioPlayer API.
 */
let currentPlayer: AudioPlayer | null = null
let stateListener: AudioStateListener | null = null
let sleepTimerListener: SleepTimerListener | null = null
let sleepTimerInterval: ReturnType<typeof setInterval> | null = null
let sleepTimerRemaining: number | null = null
let volumeBeforeFade = 1.0

const FADE_OUT_DURATION = 30

/**
 * Configures audio mode for background playback. Call once at app startup.
 */
export async function configureAudioMode(): Promise<void> {
  await setAudioModeAsync({
    shouldPlayInBackground: true,
    playsInSilentMode: true,
    interruptionMode: 'doNotMix',
  })
}

export function setStateListener(listener: AudioStateListener): void {
  stateListener = listener
}

export function setSleepTimerListener(listener: SleepTimerListener): void {
  sleepTimerListener = listener
}

/**
 * Loads an audio file and begins playback.
 */
export function loadAndPlay(uri: string): void {
  stop()

  currentPlayer = createAudioPlayer({ uri })

  currentPlayer.addListener('playbackStatusUpdate', (status: AudioStatus) => {
    if (!stateListener) return
    stateListener({
      isPlaying: status.playing,
      currentTime: status.currentTime,
      duration: status.duration,
    })
  })

  currentPlayer.play()
}

export function togglePlayPause(): void {
  if (!currentPlayer) return

  if (currentPlayer.playing) {
    currentPlayer.pause()
  } else {
    currentPlayer.play()
  }
}

export function seek(seconds: number): void {
  if (!currentPlayer) return
  currentPlayer.seekTo(seconds)
}

export function stop(): void {
  cancelSleepTimer()

  if (currentPlayer) {
    console.log('[AudioService] Stopping playback')
    if (currentPlayer.playing) {
      currentPlayer.pause()
    }
    currentPlayer.remove()
    currentPlayer = null
  }

  stateListener?.({ isPlaying: false, currentTime: 0, duration: 0 })
}

/**
 * Starts a sleep timer that stops playback after the given duration.
 * Pass null for "end of story" mode (no countdown).
 */
export function startSleepTimer(seconds: number | null): void {
  cancelSleepTimer()
  volumeBeforeFade = currentPlayer?.volume ?? 1.0

  if (seconds === null) {
    sleepTimerRemaining = null
    sleepTimerListener?.(null)
    return
  }

  sleepTimerRemaining = seconds
  sleepTimerListener?.(seconds)

  sleepTimerInterval = setInterval(() => {
    if (sleepTimerRemaining === null) return

    sleepTimerRemaining -= 1

    // Fade volume during the last 30 seconds
    if (sleepTimerRemaining <= FADE_OUT_DURATION && currentPlayer) {
      const fraction = Math.max(0, sleepTimerRemaining / FADE_OUT_DURATION)
      currentPlayer.volume = volumeBeforeFade * fraction
    }

    if (sleepTimerRemaining <= 0) {
      stop()
      return
    }

    sleepTimerListener?.(sleepTimerRemaining)
  }, 1000)
}

export function cancelSleepTimer(): void {
  if (sleepTimerInterval) {
    clearInterval(sleepTimerInterval)
    sleepTimerInterval = null
  }
  sleepTimerRemaining = null
  sleepTimerListener?.(null)

  if (currentPlayer) {
    currentPlayer.volume = volumeBeforeFade
  }
}

/** Available sleep timer duration presets. */
export const TIMER_OPTIONS: { label: string; seconds: number | null }[] = [
  { label: '5 min', seconds: 300 },
  { label: '10 min', seconds: 600 },
  { label: '15 min', seconds: 900 },
  { label: '20 min', seconds: 1200 },
  { label: '30 min', seconds: 1800 },
  { label: 'End of story', seconds: null },
]
