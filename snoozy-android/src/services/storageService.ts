import AsyncStorage from '@react-native-async-storage/async-storage'
import { File, Paths, Directory } from 'expo-file-system'
import { Story } from '@/types/story'
import { generateUUID } from '@/utils/uuid'

const STORIES_KEY = 'snoozy_stories'

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
  file.write(base64Data, { encoding: 'base64' })

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

