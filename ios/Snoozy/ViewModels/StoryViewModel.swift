import Foundation

/// The app's navigation state machine. Each case represents one screen.
enum Screen: Equatable {
    case onboarding
    case home
    case templatePicker
    case storyForm
    case player
}

/**
 Central state manager for Snoozy.

 Orchestrates the full flow: template selection -> form input -> background story
 generation (OpenAI + TTS) -> playback. Generation is non-blocking — the user
 returns to home immediately and sees a "Generating..." badge on the story row.
 */
@MainActor
@Observable
final class StoryViewModel {
    // MARK: - Navigation

    var currentScreen: Screen

    // MARK: - Template & Form

    var selectedTemplate: Template?
    var childDetails = ChildDetails()

    // MARK: - Onboarding

    private let onboardingKey = "snoozy_onboarding_complete"
    private let onboardingNameKey = "snoozy_onboarding_name"
    private let onboardingAgeKey = "snoozy_onboarding_age"

    // MARK: - Current Story

    var currentStory: Story?

    // MARK: - Saved Stories

    var savedStories: [Story] = []

    // MARK: - Services

    let audioService = AudioService()
    private let apiService = APIService()
    private let storageService = StorageService()

    // MARK: - Active generation tasks keyed by story ID

    private var generationTasks: [UUID: Task<Void, Never>] = [:]

    // MARK: - Init

    init() {
        let completed = UserDefaults.standard.bool(forKey: "snoozy_onboarding_complete")
        self.currentScreen = completed ? .home : .onboarding

        // Restore any declared child details from onboarding so they pre-fill the form.
        if completed,
           let savedName = UserDefaults.standard.string(forKey: "snoozy_onboarding_name"),
           !savedName.isEmpty {
            self.childDetails.name = savedName
            let age = UserDefaults.standard.integer(forKey: "snoozy_onboarding_age")
            if age > 0 { self.childDetails.age = age }
        }

        Task { await loadSavedStories() }
    }

    // MARK: - Onboarding

    func completeOnboarding() {
        let defaults = UserDefaults.standard
        defaults.set(true, forKey: onboardingKey)
        let trimmed = childDetails.name.trimmingCharacters(in: .whitespaces)
        if !trimmed.isEmpty {
            defaults.set(trimmed, forKey: onboardingNameKey)
            defaults.set(childDetails.age, forKey: onboardingAgeKey)
        }
        currentScreen = .home
    }

    // MARK: - Navigation

    func navigateTo(_ screen: Screen) {
        currentScreen = screen
    }

    func goHome() {
        currentScreen = .home
        selectedTemplate = nil
        childDetails = defaultChildDetails()
        currentStory = nil
    }

    // MARK: - Template Selection

    func selectTemplate(_ template: Template) {
        selectedTemplate = template
        childDetails = defaultChildDetails()
        currentScreen = .storyForm
    }

    /// Pre-fills the form with the name/age declared during onboarding.
    private func defaultChildDetails() -> ChildDetails {
        var details = ChildDetails()
        if let name = UserDefaults.standard.string(forKey: onboardingNameKey), !name.isEmpty {
            details.name = name
            let age = UserDefaults.standard.integer(forKey: onboardingAgeKey)
            if age > 0 { details.age = age }
        }
        return details
    }

    // MARK: - Story Generation (non-blocking)

    /**
     Creates a placeholder story, navigates home immediately, and kicks off
     generation in the background. The placeholder updates in-place once
     the story text and audio are ready.
     */
    func generateStory() {
        guard let template = selectedTemplate else { return }

        let storyId = UUID()
        let details = childDetails
        let voiceId = details.voiceId
        let placeholder = Story.placeholder(id: storyId, templateId: template.id, childName: details.name)

        savedStories.insert(placeholder, at: 0)
        goHome()

        let task = Task { [weak self] in
            guard let self else { return }
            await self.runGeneration(
                storyId: storyId,
                templateId: template.id,
                childDetails: details,
                voiceId: voiceId
            )
        }
        generationTasks[storyId] = task
    }

    /// The actual generation pipeline, runs in the background.
    private func runGeneration(
        storyId: UUID,
        templateId: String,
        childDetails: ChildDetails,
        voiceId: String
    ) async {
        do {
            let (title, storyText) = try await apiService.generateStory(
                templateId: templateId,
                childDetails: childDetails
            )

            let audioData = try await apiService.generateAudio(text: storyText, voice: voiceId)
            let audioFileName = try await storageService.saveAudioFile(data: audioData)

            let finishedStory = Story(
                id: storyId,
                title: title,
                storyText: storyText,
                templateId: templateId,
                childName: childDetails.name,
                createdAt: Date(),
                audioFileName: audioFileName,
                status: .ready
            )

            await storageService.saveStory(finishedStory)
            updateStoryInList(finishedStory)
        } catch {
            markStoryFailed(storyId)
        }

        generationTasks.removeValue(forKey: storyId)
    }

    // MARK: - Playback

    func playStory(_ story: Story) {
        guard story.status == .ready, let url = story.audioFileURL else { return }
        currentStory = story
        audioService.play(url: url, title: story.title)
        currentScreen = .player
    }

    // MARK: - Story Management

    func deleteStory(_ story: Story) async {
        generationTasks[story.id]?.cancel()
        generationTasks.removeValue(forKey: story.id)

        if currentStory?.id == story.id {
            audioService.stop()
            currentStory = nil
        }

        if story.status == .ready {
            await storageService.deleteStory(story)
        }

        savedStories.removeAll { $0.id == story.id }
    }

    /// Retry a failed generation by removing the old entry and starting fresh.
    func retryStory(_ story: Story) {
        savedStories.removeAll { $0.id == story.id }

        let template = Templates.all.first { $0.id == story.templateId }
        selectedTemplate = template
        childDetails = ChildDetails()
        childDetails.name = story.childName
        currentScreen = .storyForm
    }

    // MARK: - Private Helpers

    private func updateStoryInList(_ story: Story) {
        if let index = savedStories.firstIndex(where: { $0.id == story.id }) {
            savedStories[index] = story
        }
    }

    private func markStoryFailed(_ storyId: UUID) {
        if let index = savedStories.firstIndex(where: { $0.id == storyId }) {
            savedStories[index].status = .failed
            savedStories[index].title = "Story failed — tap to retry"
        }
    }

    private func loadSavedStories() async {
        let persisted = await storageService.loadStories()
        // Merge: keep in-flight placeholders, add persisted stories that aren't duplicates
        let inFlightIds = Set(generationTasks.keys)
        let inFlight = savedStories.filter { inFlightIds.contains($0.id) }
        let persistedFiltered = persisted.filter { story in !inFlightIds.contains(story.id) }
        savedStories = inFlight + persistedFiltered
    }
}
