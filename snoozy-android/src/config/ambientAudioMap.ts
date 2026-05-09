// Maps world templateId values to their bundled ambient audio files.
// Files must exist in assets/audio/ambient/ before the app is built.
// Placeholder entries (require of non-existent file) are commented out until
// the producer delivers the assets — swap each null for the require() call.
export const AMBIENT_AUDIO_MAP: Record<string, number | null> = {
  forest:  null, // require('../../assets/audio/ambient/ambient-forest.mp3')
  kingdom: null, // require('../../assets/audio/ambient/ambient-kingdom.mp3')
  space:   null, // require('../../assets/audio/ambient/ambient-space.mp3')
  ocean:   null, // require('../../assets/audio/ambient/ambient-ocean.mp3')
  clouds:  null, // require('../../assets/audio/ambient/ambient-clouds.mp3')
  jungle:  null, // require('../../assets/audio/ambient/ambient-jungle.mp3')
}

// Default ambient volume: −14.9 dB relative to full scale.
// Stories are mastered at −18 LUFS; ambient at −24 LUFS — this ratio
// keeps ambient perceptible but always subordinate to the narration.
export const DEFAULT_AMBIENT_VOLUME = 0.18

// AsyncStorage key for persisting user's preferred ambient volume.
export const AMBIENT_VOLUME_KEY = 'snoozy_ambient_volume'
