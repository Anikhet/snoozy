import { createAudioPlayer } from 'expo-audio'
import { AMBIENT_AUDIO_MAP, DEFAULT_AMBIENT_VOLUME } from '@/config/ambientAudioMap'

type AudioPlayer = ReturnType<typeof createAudioPlayer>

const FADE_IN_MS  = 1500
const FADE_OUT_MS = 2000
const FADE_STEPS  = 30

let player: AudioPlayer | null = null
let currentWorldId: string | null = null
let targetVolume = DEFAULT_AMBIENT_VOLUME
let fadeInterval: ReturnType<typeof setInterval> | null = null

function clearFade(): void {
  if (fadeInterval) {
    clearInterval(fadeInterval)
    fadeInterval = null
  }
}

function fadePlayerTo(
  p: AudioPlayer,
  fromVol: number,
  toVol: number,
  durationMs: number,
  onDone?: () => void
): void {
  clearFade()
  const stepMs = durationMs / FADE_STEPS
  const delta  = (toVol - fromVol) / FADE_STEPS
  let step = 0

  fadeInterval = setInterval(() => {
    step++
    const next = fromVol + delta * step
    p.volume = Math.max(0, Math.min(1, next))

    if (step >= FADE_STEPS) {
      clearFade()
      p.volume = toVol
      onDone?.()
    }
  }, stepMs)
}

/**
 * Starts looping ambient audio for the given worldId.
 * If the same world is already playing, this is a no-op.
 * If a different world is playing, the old one fades out and the new one fades in.
 * Silently no-ops if no audio file has been mapped for the world yet.
 */
export function startAmbient(worldId: string, volume = targetVolume): void {
  const source = AMBIENT_AUDIO_MAP[worldId]
  if (!source) return // asset not yet available

  if (currentWorldId === worldId && player) return // already playing

  targetVolume = volume

  // Stop any existing ambient first
  _stopPlayer()

  try {
    player = createAudioPlayer(source)
    player.loop = true
    player.volume = 0

    player.play()
    currentWorldId = worldId

    fadePlayerTo(player, 0, targetVolume, FADE_IN_MS)
  } catch {
    player = null
    currentWorldId = null
  }
}

/**
 * Stops ambient audio. If fadeOut is true (default), fades over FADE_OUT_MS
 * before releasing the player. Safe to call when nothing is playing.
 */
export function stopAmbient(fadeOut = true): void {
  if (!player) return

  if (!fadeOut) {
    _stopPlayer()
    return
  }

  const p = player
  const vol = p.volume

  clearFade()

  // Detach from module-level tracking immediately so a quick re-start
  // doesn't double-fade. The captured `p` reference handles cleanup.
  player = null
  currentWorldId = null

  fadePlayerTo(p, vol, 0, FADE_OUT_MS, () => {
    try {
      p.pause()
      p.remove()
    } catch {}
  })
}

/**
 * Sets the ambient volume immediately. Also updates the internal target so
 * subsequent fade-ins respect the user's chosen level.
 */
export function setVolume(volume: number): void {
  targetVolume = Math.max(0, Math.min(1, volume))
  if (player) {
    player.volume = targetVolume
  }
}

/** Returns the current target ambient volume (0–1). */
export function getVolume(): number {
  return targetVolume
}

/**
 * Fades ambient volume to zero over the given duration. Used to sync with
 * the sleep timer's narration fade. Does NOT stop the player — call
 * stopAmbient() to fully release it when the narration also stops.
 */
export function fadeToSilence(durationMs: number): void {
  if (!player) return
  fadePlayerTo(player, player.volume, 0, durationMs)
}

// ─── Internal helpers ────────────────────────────────────────────────────────

function _stopPlayer(): void {
  clearFade()
  if (player) {
    try {
      player.pause()
      player.remove()
    } catch {}
    player = null
  }
  currentWorldId = null
}
