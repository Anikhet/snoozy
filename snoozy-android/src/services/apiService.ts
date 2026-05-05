import { AppConfig } from '@/config/appConfig'
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
  templateId: string,
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
      templateId,
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
    const body = await response.text().catch(() => '')
    console.error('[API] generate-story error body:', body)
    throw new Error(`Server error: ${response.status}`)
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
  voice?: string,
  signal?: AbortSignal
): Promise<string> {
  const controller = signal ? undefined : new AbortController()
  const timeoutId = setTimeout(() => controller?.abort(), 120_000)

  const response = await fetch(`${AppConfig.backendUrl}/api/generate-audio`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ text, voice }),
    signal: signal ?? controller!.signal,
  })
  clearTimeout(timeoutId)

  if (!response.ok) {
    throw new Error(`Server error: ${response.status}`)
  }

  const blob = await response.blob()
  const base64 = await blobToBase64(blob)
  return base64
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
