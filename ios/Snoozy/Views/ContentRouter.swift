import SwiftUI

/// Root view that switches between screens based on the ViewModel's state machine.
/// Uses enum-based routing instead of NavigationStack to prevent accidental back-swipes.
struct ContentRouter: View {
    @State private var viewModel = StoryViewModel()

    var body: some View {
        ZStack {
            DesignTokens.Colors.background
                .ignoresSafeArea()

            switch viewModel.currentScreen {
            case .home:
                HomeView(
                    savedStories: viewModel.savedStories,
                    onNewStory: { viewModel.navigateTo(.templatePicker) },
                    onPlayStory: { viewModel.playStory($0) },
                    onDeleteStory: { story in Task { await viewModel.deleteStory(story) } }
                )
                .transition(.opacity)

            case .templatePicker:
                TemplatePickerView(
                    onSelect: { viewModel.selectTemplate($0) },
                    onBack: { viewModel.goHome() }
                )
                .transition(.asymmetric(insertion: .move(edge: .trailing), removal: .move(edge: .leading)))

            case .storyForm:
                StoryFormView(
                    template: viewModel.selectedTemplate!,
                    childDetails: $viewModel.childDetails,
                    errorMessage: viewModel.errorMessage,
                    onGenerate: { Task { await viewModel.generateStory() } },
                    onBack: { viewModel.navigateTo(.templatePicker) }
                )
                .transition(.asymmetric(insertion: .move(edge: .trailing), removal: .move(edge: .leading)))

            case .generating:
                GeneratingView(
                    childName: viewModel.childDetails.name,
                    phase: viewModel.generatingPhase
                )
                .transition(.opacity)

            case .player:
                if let story = viewModel.currentStory {
                    StoryPlayerView(
                        story: story,
                        audioService: viewModel.audioService,
                        onDone: { viewModel.goHome() }
                    )
                    .transition(.asymmetric(insertion: .move(edge: .bottom), removal: .opacity))
                }
            }
        }
        .animation(.easeInOut(duration: 0.35), value: viewModel.currentScreen)
    }
}
