import { z } from 'zod'

export enum StoryStatus {
  Generating = 'generating',
  Ready = 'ready',
  Failed = 'failed',
}

export interface Story {
  id: string
  title: string
  storyText: string
  templateId: string
  childName: string
  createdAt: string
  audioFileName: string
  status: StoryStatus
  isFavorite?: boolean
  rating?: number
}

export type Pronouns = 'he/him' | 'she/her' | 'they/them'

export interface ChildDetails {
  name: string
  age: number
  pronouns: Pronouns
  favoriteColor?: string
  favoriteAnimal?: string
  favoriteThing?: string
  voiceId: string
}

export const DEFAULT_CHILD_DETAILS: ChildDetails = {
  name: '',
  age: 5,
  pronouns: 'they/them',
  voiceId: 'shimmer',
}

export const storyResponseSchema = z.object({
  success: z.boolean(),
  title: z.string().optional(),
  storyText: z.string().optional(),
  error: z.string().optional(),
})

export const generateStoryRequestSchema = z.object({
  templateId: z.string(),
  childDetails: z.object({
    name: z.string().min(1).max(50),
    age: z.number().int().min(1).max(10),
    favoriteColor: z.string().max(30).optional(),
    favoriteAnimal: z.string().max(30).optional(),
    favoriteThing: z.string().max(50).optional(),
  }),
})

export const generateAudioRequestSchema = z.object({
  text: z.string().min(1).max(5000),
  voiceId: z.string().optional(),
})

/**
 * Creates a placeholder story shown in the list while generation is in progress.
 */
export function createPlaceholderStory(
  id: string,
  templateId: string,
  childName: string
): Story {
  return {
    id,
    title: `Creating story for ${childName}...`,
    storyText: '',
    templateId,
    childName,
    createdAt: new Date().toISOString(),
    audioFileName: '',
    status: StoryStatus.Generating,
  }
}
