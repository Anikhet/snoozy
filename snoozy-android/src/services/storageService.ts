import AsyncStorage from '@react-native-async-storage/async-storage'
import { File, Paths, Directory } from 'expo-file-system'
import { Story } from '@/types/story'
import { VoiceProfile } from '@/types/voice'
import { generateUUID } from '@/utils/uuid'

const STORIES_KEY        = 'snoozy_stories'
const VOICE_PROFILES_KEY = 'snoozy_voice_profiles'
const LEGACY_PROFILE_KEY = 'snoozy_child_profile'

function getAudioDir(): Directory {
  return new Directory(Paths.document, 'Audio')
}

/**
 * Ensures the Audio directory exists in the document directory.
 */
function ensureAudioDir(): void {
  const dir = getAudioDir()
  if (!dir.exists) {
    dir.create()
  }
}

/**
 * Loads all saved stories from AsyncStorage, sorted newest first.
 */
export async function loadStories(): Promise<Story[]> {
  try {
    const json = await AsyncStorage.getItem(STORIES_KEY)
    if (!json) return []

    const stories: Story[] = JSON.parse(json)
    return stories.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  } catch (error) {
    console.error('Failed to load stories from storage:', error)
    return []
  }
}

/**
 * Saves or updates a story in the persisted list (upsert by id).
 */
export async function saveStory(story: Story): Promise<void> {
  const stories = await loadStories()
  const index = stories.findIndex((s) => s.id === story.id)

  const updated =
    index >= 0
      ? stories.map((s) => (s.id === story.id ? story : s))
      : [story, ...stories]

  await AsyncStorage.setItem(STORIES_KEY, JSON.stringify(updated))
}

/**
 * Removes a story from storage and deletes its audio file.
 */
export async function deleteStory(story: Story): Promise<void> {
  const stories = await loadStories()
  const filtered = stories.filter((s) => s.id !== story.id)
  await AsyncStorage.setItem(STORIES_KEY, JSON.stringify(filtered))

  if (story.audioFileName) {
    deleteAudioFile(story.audioFileName)
  }
}

/**
 * Writes base64-encoded MP3 data to the Audio directory.
 * Returns the generated filename.
 */
export function saveAudioFile(base64Data: string): string {
  ensureAudioDir()

  const fileName = `${generateUUID()}.mp3`
  const file = new File(getAudioDir(), fileName)
  const binary = atob(base64Data)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  file.write(bytes)

  return fileName
}

/**
 * Deletes an audio file from the Audio directory.
 */
export function deleteAudioFile(fileName: string): void {
  const file = new File(getAudioDir(), fileName)
  if (file.exists) {
    file.delete()
  }
}

/**
 * Returns the full file URI for an audio file.
 */
export function getAudioFileUri(fileName: string): string {
  const file = new File(getAudioDir(), fileName)
  return file.uri
}

// ─── Voice Profiles ───────────────────────────────────────────────────────────

/**
 * Loads saved voice profiles. On first run, migrates any fishVoiceModelId
 * from the legacy child profile key into a VoiceProfile entry.
 */
export async function loadVoiceProfiles(): Promise<VoiceProfile[]> {
  try {
    const json = await AsyncStorage.getItem(VOICE_PROFILES_KEY)
    if (json) return JSON.parse(json) as VoiceProfile[]

    // One-time migration from old fishVoiceModelId in child profile
    const legacyJson = await AsyncStorage.getItem(LEGACY_PROFILE_KEY)
    if (legacyJson) {
      const legacy = JSON.parse(legacyJson) as Record<string, unknown>
      if (typeof legacy.fishVoiceModelId === 'string') {
        const migrated: VoiceProfile = {
          id: generateUUID(),
          name: 'My Voice',
          modelId: legacy.fishVoiceModelId,
          createdAt: new Date().toISOString(),
        }
        await AsyncStorage.setItem(VOICE_PROFILES_KEY, JSON.stringify([migrated]))
        return [migrated]
      }
    }
    return []
  } catch {
    return []
  }
}

/** Upserts a voice profile by id. */
export async function saveVoiceProfile(profile: VoiceProfile): Promise<void> {
  const profiles = await loadVoiceProfiles()
  const idx = profiles.findIndex((p) => p.id === profile.id)
  const updated = idx >= 0
    ? profiles.map((p) => (p.id === profile.id ? profile : p))
    : [...profiles, profile]
  await AsyncStorage.setItem(VOICE_PROFILES_KEY, JSON.stringify(updated))
}

/** Removes a voice profile by id. */
export async function deleteVoiceProfile(id: string): Promise<void> {
  const profiles = await loadVoiceProfiles()
  await AsyncStorage.setItem(
    VOICE_PROFILES_KEY,
    JSON.stringify(profiles.filter((p) => p.id !== id)),
  )
}

