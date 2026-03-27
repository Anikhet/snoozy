import Foundation

/// The app's navigation state machine. Each case represents one screen.
enum Screen: Equatable {
    case home
    case templatePicker
    case storyForm
    case generating
    case player
}

/// The phase within story generation, shown on the loading screen.
enum GeneratingPhase: Equatable {
    case writingStory
    case generatingAudio
}

/**
 Central state manager for Snoozy.

 Orchestrates the full flow: template selection -> form input -> story generation
 (OpenAI) -> audio generation (ElevenLabs) -> playback. Coordinates APIService,
 StorageService, and AudioService while managing navigation state.
 */
@MainActor
@Observable
final class StoryViewModel {
    // MARK: - Navigation

    var currentScreen: Screen = .home

    // MARK: - Template & Form

    var selectedTemplate: Template?
    var childDetails = ChildDetails()

    // MARK: - Generation

    var generatingPhase: GeneratingPhase = .writingStory
    var errorMessage: String?

    // MARK: - Current Story

    var currentStory: Story?

    // MARK: - Saved Stories

    var savedStories: [Story] = []

    // MARK: - Services

    let audioService = AudioService()
    private let apiService = APIService()
    private let storageService = StorageService()

    // MARK: - Init

    init() {
        Task { await loadSavedStories() }
    }

    // MARK: - Navigation

    func navigateTo(_ screen: Screen) {
        currentScreen = screen
    }

    func goHome() {
        currentScreen = .home
        selectedTemplate = nil
        childDetails = ChildDetails()
        currentStory = nil
        errorMessage = nil
    }

    // MARK: - Template Selection

    func selectTemplate(_ template: Template) {
        selectedTemplate = template
        childDetails = ChildDetails()
        currentScreen = .storyForm
    }

    // MARK: - Story Generation

    /// Kicks off the full generation pipeline: story text -> audio -> save -> navigate to player.
    func generateStory() async {
        guard let template = selectedTemplate else { return }

        currentScreen = .generating
        generatingPhase = .writingStory
        errorMessage = nil

        do {
            let (title, storyText) = try await apiService.generateStory(
                templateId: template.id,
                childDetails: childDetails
            )

            generatingPhase = .generatingAudio

            let audioData = try await apiService.generateAudio(text: storyText)

            let audioFileName = try await storageService.saveAudioFile(data: audioData)

            let story = Story(
                id: UUID(),
                title: title,
                storyText: storyText,
                templateId: template.id,
                childName: childDetails.name,
                createdAt: Date(),
                audioFileName: audioFileName
            )

            await storageService.saveStory(story)
            currentStory = story
            await loadSavedStories()

            playStory(story)
            currentScreen = .player
        } catch {
            errorMessage = error.localizedDescription
            currentScreen = .storyForm
        }
    }

    // MARK: - Playback

    func playStory(_ story: Story) {
        guard let url = story.audioFileURL else { return }
        currentStory = story
        audioService.play(url: url, title: story.title)
        currentScreen = .player
    }

    // MARK: - Story Management

    func deleteStory(_ story: Story) async {
        if currentStory?.id == story.id {
            audioService.stop()
            currentStory = nil
        }
        await storageService.deleteStory(story)
        await loadSavedStories()
    }

    // MARK: - Private

    private func loadSavedStories() async {
        savedStories = await storageService.loadStories()
    }
}
