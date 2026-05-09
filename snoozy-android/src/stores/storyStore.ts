import { create } from 'zustand'
import { Screen } from '@/types/navigation'
import {
  Story,
  ChildDetails,
  StoryStatus,
  DEFAULT_CHILD_DETAILS,
  createPlaceholderStory,
} from '@/types/story'
import { VoiceProfile } from '@/types/voice'
import { Subscription, DEFAULT_SUBSCRIPTION } from '@/types/subscription'
import * as apiService from '@/services/apiService'
import * as storageService from '@/services/storageService'
import * as audioService from '@/services/audioService'
import * as subscriptionService from '@/services/subscriptionService'
import { generateUUID } from '@/utils/uuid'

/**
 * Module-level map tracking in-flight generation tasks by story ID.
 * Stores AbortController instances for cancellation.
 */
const generationTasks = new Map<string, AbortController>()

type OnboardingDefaults = {
  name: string
  age: number
  pronouns: import('@/types/story').Pronouns
  voiceId?: string
}

interface StoryStore {
  currentScreen: Screen
  /** Direction of the last navigation — used by App.tsx to pick enter/exit animations. */
  navDir: 'forward' | 'back'
  selectedWorldId: string | null
  selectedVibeId: string | null
  generatingStoryId: string | null
  childDetails: ChildDetails
  /** Child profile set once post-signup. Seeds every story. */
  onboardingDefaults: OnboardingDefaults | null
  currentStory: Story | null
  savedStories: Story[]
  isPlaying: boolean
  currentTime: number
  duration: number
  sleepTimerRemaining: number | null

  navigateTo: (screen: Screen) => void
  navigateToWorldPicker: () => void
  /** Navigate back to WorldPicker (from VibePicker). Sets navDir='back' for correct exit animation. */
  backToWorldPicker: () => void
  navigateToVibePicker: (worldId: string) => void
  navigateToGenerating: () => void
  navigateToStoryEnd: () => void
  navigateToLibrary: () => void
  navigateToInsights: () => void
  goHome: () => void
  updateChildDetails: (partial: Partial<ChildDetails>) => void
  setOnboardingDefaults: (defaults: OnboardingDefaults) => void
  updateSavedVoice: (voiceId: string) => void
  generateStory: (vibeId: string, getToken: () => Promise<string | null>) => void
  playStory: (story: Story) => void
  deleteStory: (story: Story) => Promise<void>
  retryStory: (story: Story) => void
  loadSavedStories: () => Promise<void>
  togglePlayPause: () => void
  seek: (seconds: number) => void
  startSleepTimer: (seconds: number | null) => void
  cancelSleepTimer: () => void
  stopPlayback: () => void
  editingProfile: boolean
  openProfileEdit: () => void
  closeProfileEdit: () => void
  toggleFavorite: (storyId: string) => void
  rateStory: (storyId: string, stars: number) => void
  cancelGeneration: () => void
  profilePanel: 'storyPrefs' | 'bedtimeReminder' | 'accountDetails' | 'favoriteThemes' | 'passwordSecurity' | 'snoozyPlus' | 'voiceSetup' | null
  openProfilePanel: (panel: NonNullable<StoryStore['profilePanel']>) => void
  closeProfilePanel: () => void

  // ── Voice Profiles ───────────────────────────────────────────────────────────
  voiceProfiles: VoiceProfile[]
  loadVoiceProfiles: () => Promise<void>
  addVoiceProfile: (profile: VoiceProfile) => Promise<void>
  removeVoiceProfile: (id: string) => Promise<void>

  // ── Subscription ────────────────────────────────────────────────────────────
  subscription: Subscription
  loadSubscription: () => Promise<void>
  activateSubscription: (params: {
    plan: import('@/types/subscription').SubscriptionPlan
    provider: import('@/types/subscription').SubscriptionProvider
    transactionId: string
  }) => Promise<void>
  setSubscription: (sub: Subscription) => void
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
    set({ navDir: 'forward', currentScreen: Screen.StoryEnd })
  })

  return {
    currentScreen: Screen.Home,
    navDir: 'forward' as const,
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
    editingProfile: false,
    profilePanel: null,
    voiceProfiles: [],

    navigateTo: (screen) => set({ currentScreen: screen }),

    openProfileEdit: () => set({ editingProfile: true }),

    closeProfileEdit: () => set({ navDir: 'back' as const, editingProfile: false }),

    openProfilePanel: (panel) => set({ profilePanel: panel }),

    closeProfilePanel: () => set({ profilePanel: null }),

    navigateToWorldPicker: () => set({ navDir: 'forward' as const, currentScreen: Screen.WorldPicker }),

    backToWorldPicker: () => set({ navDir: 'back' as const, currentScreen: Screen.WorldPicker }),

    navigateToVibePicker: (worldId: string) =>
      set({ navDir: 'forward' as const, selectedWorldId: worldId, currentScreen: Screen.VibePicker }),

    navigateToGenerating: () => set({ navDir: 'forward' as const, currentScreen: Screen.Generating }),

    navigateToStoryEnd: () => set({ navDir: 'forward' as const, currentScreen: Screen.StoryEnd }),

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
        navDir: 'back' as const,
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

    /**
     * Called when the child profile is saved (name/age/pronouns).
     * Merges into existing onboardingDefaults so voiceId is never lost
     * when a name change comes in without a voiceId.
     */
    setOnboardingDefaults: (defaults) =>
      set((s) => {
        const merged: OnboardingDefaults = {
          ...defaults,
          voiceId: defaults.voiceId ?? s.onboardingDefaults?.voiceId,
        }
        return {
          onboardingDefaults: merged,
          childDetails: {
            ...s.childDetails,
            name: defaults.name,
            age: defaults.age,
            pronouns: defaults.pronouns,
            voiceId: merged.voiceId ?? s.childDetails.voiceId,
          },
        }
      }),

    updateSavedVoice: (voiceId) =>
      set((s) => ({
        childDetails: { ...s.childDetails, voiceId },
        onboardingDefaults: s.onboardingDefaults
          ? { ...s.onboardingDefaults, voiceId }
          : s.onboardingDefaults,
      })),

    generateStory: (vibeId, getToken) => {
      const { selectedWorldId, childDetails } = get()
      if (!selectedWorldId) return

      const storyId = generateUUID()
      const placeholder = createPlaceholderStory(storyId, selectedWorldId, childDetails.name)

      set((s) => ({
        navDir: 'forward' as const,
        savedStories: [placeholder, ...s.savedStories],
        currentScreen: Screen.Generating,
        generatingStoryId: storyId,
        selectedVibeId: vibeId,
        childDetails: freshChildDetails(s.onboardingDefaults),
        currentStory: null,
      }))

      const abortController = new AbortController()
      generationTasks.set(storyId, abortController)

      const details = { ...childDetails }
      const voiceId = details.voiceId

      runGeneration(storyId, selectedWorldId, vibeId, details, voiceId, getToken, abortController.signal)
    },

    playStory: (story) => {
      if (story.status !== StoryStatus.Ready || !story.audioFileName) return
      const uri = storageService.getAudioFileUri(story.audioFileName)
      set({ navDir: 'forward', currentStory: story, currentScreen: Screen.Player })
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
        navDir: 'forward' as const,
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
        navDir: 'back' as const,
        currentScreen: Screen.Home,
        currentStory: null,
        childDetails: freshChildDetails(s.onboardingDefaults),
      }))
    },

    // ── Voice Profiles ────────────────────────────────────────────────────────

    loadVoiceProfiles: async () => {
      const profiles = await storageService.loadVoiceProfiles()
      set((s) => {
        // Activate the first profile if no voice is currently selected
        const hasCustomVoice = profiles.some((p) => p.modelId === s.childDetails.voiceId)
        if (!hasCustomVoice && profiles.length > 0) {
          const voiceId = profiles[0].modelId
          return {
            voiceProfiles: profiles,
            childDetails: { ...s.childDetails, voiceId },
            onboardingDefaults: s.onboardingDefaults
              ? { ...s.onboardingDefaults, voiceId }
              : s.onboardingDefaults,
          }
        }
        return { voiceProfiles: profiles }
      })
    },

    addVoiceProfile: async (profile) => {
      await storageService.saveVoiceProfile(profile)
      set((s) => ({
        voiceProfiles: [...s.voiceProfiles, profile],
        childDetails: { ...s.childDetails, voiceId: profile.modelId },
        onboardingDefaults: s.onboardingDefaults
          ? { ...s.onboardingDefaults, voiceId: profile.modelId }
          : s.onboardingDefaults,
      }))
    },

    removeVoiceProfile: async (id) => {
      const { voiceProfiles, childDetails, onboardingDefaults } = get()
      const profile = voiceProfiles.find((p) => p.id === id)
      const remaining = voiceProfiles.filter((p) => p.id !== id)

      const wasActive = profile?.modelId === childDetails.voiceId
      const newVoiceId = wasActive
        ? (remaining[0]?.modelId ?? DEFAULT_CHILD_DETAILS.voiceId)
        : childDetails.voiceId

      await storageService.deleteVoiceProfile(id)
      set({
        voiceProfiles: remaining,
        childDetails: { ...childDetails, voiceId: newVoiceId },
        onboardingDefaults: onboardingDefaults
          ? { ...onboardingDefaults, voiceId: newVoiceId }
          : onboardingDefaults,
      })
    },

    // ── Subscription ──────────────────────────────────────────────────────────
    subscription: { ...DEFAULT_SUBSCRIPTION },

    setSubscription: (sub) => set({ subscription: sub }),

    loadSubscription: async () => {
      const sub = await subscriptionService.loadSubscription()
      set({ subscription: sub })
    },

    activateSubscription: async (params) => {
      const sub = await subscriptionService.activateSubscription(params)
      set({ subscription: sub })
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
        navDir: 'back' as const,
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
 * Returns a fresh ChildDetails instance seeded from onboardingDefaults.
 * voiceId is preserved so voice profiles survive navigation resets.
 */
function freshChildDetails(defaults: OnboardingDefaults | null): ChildDetails {
  if (!defaults) return { ...DEFAULT_CHILD_DETAILS }
  return {
    ...DEFAULT_CHILD_DETAILS,
    name: defaults.name,
    age: defaults.age,
    pronouns: defaults.pronouns,
    voiceId: defaults.voiceId ?? DEFAULT_CHILD_DETAILS.voiceId,
  }
}

/**
 * Background generation pipeline: generates story text, then audio,
 * saves both, and updates the placeholder in the store.
 */
async function runGeneration(
  storyId: string,
  worldId: string,
  vibeId: string,
  childDetails: ChildDetails,
  voiceId: string,
  getToken: () => Promise<string | null>,
  signal: AbortSignal
): Promise<void> {
  try {
    const storyToken = await getToken()
    if (!storyToken) throw new Error('Not authenticated')

    const { title, storyText } = await apiService.generateStory(
      worldId,
      vibeId,
      childDetails,
      storyToken,
      signal
    )

    const audioToken = await getToken()
    if (!audioToken) throw new Error('Not authenticated')

    const audioBase64 = await apiService.generateAudio(storyText, audioToken, voiceId, signal, vibeId)
    const audioFileName = await storageService.saveAudioFile(audioBase64)

    const displayText = storyText
      .replace(/\[[^\]]+\]/g, '')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n[ \t]+/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim()

    const finishedStory: Story = {
      id: storyId,
      title,
      storyText: displayText,
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
        ? { ...story, status: StoryStatus.Failed, title: 'Story failed — tap to retry' }
        : story
    ),
  }))
}
