import { AppConfig } from '@/config/appConfig'
import { VOICES } from '@/config/voices'
import { ChildDetails, storyResponseSchema } from '@/types/story'

interface StoryResult {
  title: string
  storyText: string
}

/**
 * Calls the backend to generate a bedtime story using GPT.
 * Returns the story title and text.
 */
export async function generateStory(
  worldId: string,
  vibeId: string,
  childDetails: ChildDetails,
  token: string,
  signal?: AbortSignal
): Promise<StoryResult> {
  const controller = signal ? undefined : new AbortController()
  const timeoutId = setTimeout(() => controller?.abort(), 60_000)

  const response = await fetch(`${AppConfig.backendUrl}/api/generate-story`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      worldId,
      vibeId,
      childDetails: {
        name: childDetails.name,
        age: childDetails.age,
        pronouns: childDetails.pronouns,
      },
    }),
    signal: signal ?? controller!.signal,
  })
  clearTimeout(timeoutId)

  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { error?: string }
    console.error('[API] generate-story error:', response.status, body)
    throw new Error(body.error ?? `Server error: ${response.status}`)
  }

  const json = await response.json()
  const parsed = storyResponseSchema.parse(json)

  if (!parsed.success || !parsed.title || !parsed.storyText) {
    throw new Error(parsed.error ?? 'Failed to generate story')
  }

  return { title: parsed.title, storyText: parsed.storyText }
}

/**
 * Calls the backend to generate TTS audio for a story.
 * Returns the raw MP3 binary as a base64 string for expo-file-system.
 */
export async function generateAudio(
  text: string,
  token: string,
  voiceId?: string,
  signal?: AbortSignal,
  vibeId?: string,
): Promise<string> {
  const controller = signal ? undefined : new AbortController()
  const timeoutId = setTimeout(() => controller?.abort(), 120_000)

  const response = await fetch(`${AppConfig.backendUrl}/api/generate-audio`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(buildVoicePayload(voiceId, text, vibeId)),
    signal: signal ?? controller!.signal,
  })
  clearTimeout(timeoutId)

  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as { error?: string }
    console.error('[API] generate-audio error:', response.status, body)
    throw new Error(body.error ?? `Server error: ${response.status}`)
  }

  const blob = await response.blob()
  const base64 = await blobToBase64(blob)
  return base64
}

function buildVoicePayload(voiceId: string | undefined, text: string, vibeId: string | undefined) {
  const voice = VOICES.find((v) => v.id === voiceId)
  // Built-in ElevenLabs voice → elevenlabs
  // Built-in Fish Audio voice, cloned voice (not in VOICES), or undefined → fishaudio
  const provider: 'elevenlabs' | 'fishaudio' = voice?.provider === 'elevenlabs' ? 'elevenlabs' : 'fishaudio'
  return { text, voiceId, provider, vibeId }
}

/**
 * Uploads an audio recording to the backend to create a Fish Audio voice clone.
 * Returns the voice model ID to store in the child profile.
 */
export async function createVoiceClone(
  audioUri: string,
  voiceName: string,
  token: string,
): Promise<string> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 60_000)

  const ext = audioUri.split('.').pop()?.toLowerCase() ?? 'm4a'
  const mimeType = ext === 'wav' ? 'audio/wav' : ext === 'flac' ? 'audio/flac' : 'audio/mp4'

  const formData = new FormData()
  formData.append('audio', { uri: audioUri, type: mimeType, name: `voice-sample.${ext}` } as unknown as Blob)
  formData.append('voiceName', voiceName)

  const response = await fetch(`${AppConfig.backendUrl}/api/create-voice-clone`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
    signal: controller.signal,
  })
  clearTimeout(timeoutId)

  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as Record<string, string>
    throw new Error(body.error ?? `Voice clone failed (${response.status})`)
  }

  const data = await response.json()
  return data.voiceModelId as string
}

/**
 * Deletes a Fish Audio voice clone model. Call when the user removes their voice.
 */
export async function deleteVoiceClone(modelId: string, token: string): Promise<void> {
  const response = await fetch(`${AppConfig.backendUrl}/api/voice-clone/${encodeURIComponent(modelId)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!response.ok && response.status !== 404) {
    throw new Error(`Delete voice clone failed (${response.status})`)
  }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      const base64 = dataUrl.split(',')[1]
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}
