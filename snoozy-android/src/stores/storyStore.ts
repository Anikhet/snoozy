import { create } from 'zustand'
import { Screen } from '@/types/navigation'
import {
  Story,
  ChildDetails,
  StoryStatus,
  DEFAULT_CHILD_DETAILS,
  createPlaceholderStory,
} from '@/types/story'
import * as apiService from '@/services/apiService'
import * as storageService from '@/services/storageService'
import * as audioService from '@/services/audioService'
import { generateUUID } from '@/utils/uuid'

/**
 * Module-level map tracking in-flight generation tasks by story ID.
 * Stores AbortController instances for cancellation.
 */
const generationTasks = new Map<string, AbortController>()

const WORLD_TO_TEMPLATE_ID: Record<string, string> = {
  kingdom: 'dreamland',
  forest:  'fairy-garden',
  space:   'space-explorer',
  ocean:   'underwater-journey',
  clouds:  'under-the-stars',
  jungle:  'animal-friends',
}

interface StoryStore {
  currentScreen: Screen
  selectedWorldId: string | null
  selectedVibeId: string | null
  generatingStoryId: string | null
  childDetails: ChildDetails
  /** Name/age declared during onboarding. Seeds every story form so the
   *  parent doesn't retype the same details every night. */
  onboardingDefaults: { name: string; age: number } | null
  currentStory: Story | null
  savedStories: Story[]
  isPlaying: boolean
  currentTime: number
  duration: number
  sleepTimerRemaining: number | null

  navigateTo: (screen: Screen) => void
  navigateToWorldPicker: () => void
  navigateToStoryConfig: (worldId: string, vibeId: string) => void
  navigateToGenerating: () => void
  navigateToStoryEnd: () => void
  navigateToLibrary: () => void
  navigateToInsights: () => void
  goHome: () => void
  updateChildDetails: (partial: Partial<ChildDetails>) => void
  setOnboardingDefaults: (defaults: { name: string; age: number }) => void
  generateStory: (token: string) => void
  playStory: (story: Story) => void
  deleteStory: (story: Story) => Promise<void>
  retryStory: (story: Story) => void
  loadSavedStories: () => Promise<void>
  togglePlayPause: () => void
  seek: (seconds: number) => void
  startSleepTimer: (seconds: number | null) => void
  cancelSleepTimer: () => void
  stopPlayback: () => void
  toggleFavorite: (storyId: string) => void
  rateStory: (storyId: string, stars: number) => void
  cancelGeneration: () => void
}

export const useStoryStore = create<StoryStore>((set, get) => {
  // Wire up audio state listener to sync into Zustand
  audioService.setStateListener(({ isPlaying, currentTime, duration }) => {
    set({ isPlaying, currentTime, duration })
  })

  audioService.setSleepTimerListener((remaining) => {
    set({ sleepTimerRemaining: remaining })
  })

  // Navigate to StoryEnd when audio finishes naturally
  audioService.setCompletionListener(() => {
    set({ currentScreen: Screen.StoryEnd })
  })

  return {
    currentScreen: Screen.Home,
    selectedWorldId: null,
    selectedVibeId: null,
    generatingStoryId: null,
    childDetails: { ...DEFAULT_CHILD_DETAILS },
    onboardingDefaults: null,
    currentStory: null,
    savedStories: [],
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    sleepTimerRemaining: null,

    navigateTo: (screen) => set({ currentScreen: screen }),

    navigateToWorldPicker: () => set({ currentScreen: Screen.WorldPicker }),

    navigateToStoryConfig: (worldId, vibeId) =>
      set({ selectedWorldId: worldId, selectedVibeId: vibeId, currentScreen: Screen.StoryConfig }),

    navigateToGenerating: () => set({ currentScreen: Screen.Generating }),

    navigateToStoryEnd: () => set({ currentScreen: Screen.StoryEnd }),

    navigateToLibrary: () => set({ currentScreen: Screen.Library }),

    navigateToInsights: () => set({ currentScreen: Screen.Insights }),

    toggleFavorite: (storyId) => {
      const story = get().savedStories.find((s) => s.id === storyId)
      if (!story) return
      const updated = { ...story, isFavorite: !story.isFavorite }
      set((s) => ({
        savedStories: s.savedStories.map((st) => (st.id === storyId ? updated : st)),
      }))
      storageService.saveStory(updated).catch(() => {})
    },

    rateStory: (storyId, stars) => {
      const story = get().savedStories.find((s) => s.id === storyId)
      if (!story) return
      const updated = { ...story, rating: stars }
      set((s) => ({
        savedStories: s.savedStories.map((st) => (st.id === storyId ? updated : st)),
      }))
      storageService.saveStory(updated).catch(() => {})
    },

    goHome: () =>
      set((s) => ({
        currentScreen: Screen.Home,
        generatingStoryId: null,
        selectedWorldId: null,
        selectedVibeId: null,
        childDetails: freshChildDetails(s.onboardingDefaults),
        currentStory: null,
      })),

    updateChildDetails: (partial) =>
      set((s) => ({
        childDetails: { ...s.childDetails, ...partial },
      })),

    setOnboardingDefaults: (defaults) =>
      set((s) => ({
        onboardingDefaults: defaults,
        // Seed the current form too if it's empty
        childDetails: s.childDetails.name
          ? s.childDetails
          : { ...s.childDetails, name: defaults.name, age: defaults.age },
      })),

    generateStory: (token) => {
      const { selectedWorldId, childDetails } = get()
      if (!selectedWorldId) return
      const apiTemplateId = WORLD_TO_TEMPLATE_ID[selectedWorldId] ?? selectedWorldId

      const storyId = generateUUID()
      const placeholder = createPlaceholderStory(storyId, selectedWorldId, childDetails.name)

      set((s) => ({
        savedStories: [placeholder, ...s.savedStories],
        currentScreen: Screen.Generating,
        generatingStoryId: storyId,
        childDetails: freshChildDetails(s.onboardingDefaults),
        currentStory: null,
      }))

      const abortController = new AbortController()
      generationTasks.set(storyId, abortController)

      const details = { ...childDetails }
      const voiceId = details.voiceId

      runGeneration(storyId, selectedWorldId, apiTemplateId, details, voiceId, token, abortController.signal)
    },

    playStory: (story) => {
      if (story.status !== StoryStatus.Ready || !story.audioFileName) return
      const uri = storageService.getAudioFileUri(story.audioFileName)
      set({ currentStory: story, currentScreen: Screen.Player })
      audioService.loadAndPlay(uri)
    },

    deleteStory: async (story) => {
      const controller = generationTasks.get(story.id)
      if (controller) {
        controller.abort()
        generationTasks.delete(story.id)
      }

      if (get().currentStory?.id === story.id) {
        await audioService.stop()
        set({ currentStory: null })
      }

      if (story.status === StoryStatus.Ready) {
        await storageService.deleteStory(story)
      }

      set((state) => ({
        savedStories: state.savedStories.filter((item) => item.id !== story.id),
      }))
    },

    retryStory: (story) => {
      set((state) => ({
        savedStories: state.savedStories.filter((item) => item.id !== story.id),
        childDetails: {
          ...freshChildDetails(state.onboardingDefaults),
          name: story.childName,
        },
        currentScreen: Screen.WorldPicker,
      }))
    },

    /**
     * Loads persisted stories and merges with in-flight placeholders.
     */
    loadSavedStories: async () => {
      const persisted = await storageService.loadStories()
      const inFlightIds = new Set(generationTasks.keys())

      set((s) => {
        const inFlight = s.savedStories.filter((story) =>
          inFlightIds.has(story.id)
        )
        const persistedFiltered = persisted.filter(
          (story) => !inFlightIds.has(story.id)
        )
        return { savedStories: [...inFlight, ...persistedFiltered] }
      })
    },

    togglePlayPause: () => audioService.togglePlayPause(),
    seek: (seconds) => audioService.seek(seconds),
    startSleepTimer: (seconds) => audioService.startSleepTimer(seconds),
    cancelSleepTimer: () => audioService.cancelSleepTimer(),

    stopPlayback: () => {
      audioService.stop()
      set((s) => ({
        currentScreen: Screen.Home,
        currentStory: null,
        childDetails: freshChildDetails(s.onboardingDefaults),
      }))
    },

    cancelGeneration: () => {
      const { generatingStoryId } = get()
      if (generatingStoryId) {
        const controller = generationTasks.get(generatingStoryId)
        if (controller) {
          controller.abort()
          generationTasks.delete(generatingStoryId)
        }
      }
      set((s) => ({
        currentScreen: Screen.Home,
        generatingStoryId: null,
        selectedWorldId: null,
        selectedVibeId: null,
        childDetails: freshChildDetails(s.onboardingDefaults),
        currentStory: null,
        savedStories: generatingStoryId
          ? s.savedStories.filter((st) => st.id !== generatingStoryId)
          : s.savedStories,
      }))
    },
  }
})

/**
 * Returns a fresh ChildDetails instance seeded with the onboarding-declared
 * name/age (if any). Keeps the parent from having to retype every night.
 */
function freshChildDetails(
  defaults: { name: string; age: number } | null,
): ChildDetails {
  if (!defaults) return { ...DEFAULT_CHILD_DETAILS }
  return { ...DEFAULT_CHILD_DETAILS, name: defaults.name, age: defaults.age }
}

/**
 * Background generation pipeline: generates story text, then audio,
 * saves both, and updates the placeholder in the store.
 */
async function runGeneration(
  storyId: string,
  worldId: string,
  apiTemplateId: string,
  childDetails: ChildDetails,
  voiceId: string,
  token: string,
  signal: AbortSignal
): Promise<void> {
  try {
    const { title, storyText } = await apiService.generateStory(
      apiTemplateId,
      childDetails,
      token,
      signal
    )

    const audioBase64 = await apiService.generateAudio(storyText, token, voiceId, signal)
    const audioFileName = await storageService.saveAudioFile(audioBase64)

    const finishedStory: Story = {
      id: storyId,
      title,
      storyText,
      templateId: worldId,
      childName: childDetails.name,
      createdAt: new Date().toISOString(),
      audioFileName,
      status: StoryStatus.Ready,
    }

    await storageService.saveStory(finishedStory)
    updateStoryInStore(finishedStory)
  } catch (error) {
    if (signal.aborted) return
    console.error('[StoryGen] Failed:', error)
    markStoryFailed(storyId)
  } finally {
    generationTasks.delete(storyId)
  }
}

function updateStoryInStore(story: Story): void {
  useStoryStore.setState((s) => ({
    savedStories: s.savedStories.map((existing) =>
      existing.id === story.id ? story : existing
    ),
  }))
}

function markStoryFailed(storyId: string): void {
  useStoryStore.setState((s) => ({
    savedStories: s.savedStories.map((story) =>
      story.id === storyId
        ? { ...story, status: StoryStatus.Failed, title: 'Story failed \u2014 tap to retry' }
        : story
    ),
  }))
}
