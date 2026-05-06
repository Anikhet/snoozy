import { NarrationVoice } from '@/types/voice'

export const VOICES: NarrationVoice[] = [
  { id: 'shimmer', displayName: 'Luna', description: 'Warm & gentle', provider: 'openai' },
  { id: 'qBDvhofpxp92JgXJxDjB', displayName: 'Lily', description: 'Soft & warm', provider: 'elevenlabs' },
  { id: 'nova', displayName: 'Sage', description: 'Calm & clear', provider: 'openai' },
  { id: 'onyx', displayName: 'Bear', description: 'Deep & soothing', provider: 'openai' },
  { id: 'fable', displayName: 'Meadow', description: 'Soft & storytelling', provider: 'openai' },
  { id: 'tQ4MEZFJOzsahSEEZtHK', displayName: 'Ivanna', description: 'Soft & warm', provider: 'elevenlabs' },
  { id: 'flHkNRp1BlvT73UL6gyz', displayName: 'Jessica', description: 'Soft & warm', provider: 'elevenlabs' },
  { id: '6p0P6gezgvY1v6xbLzmU', displayName: 'Anvi', description: 'Soft & warm', provider: 'elevenlabs' },
]

export const DEFAULT_VOICE = VOICES[0]
