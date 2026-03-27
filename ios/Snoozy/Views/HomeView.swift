import SwiftUI

/// The landing screen with a time-based greeting, new story button, and list of saved stories.
struct HomeView: View {
    let savedStories: [Story]
    let onNewStory: () -> Void
    let onPlayStory: (Story) -> Void
    let onDeleteStory: (Story) -> Void
    let onRetryStory: (Story) -> Void

    var body: some View {
        VStack(spacing: 0) {
            headerSection
            storiesSection
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    // MARK: - Header

    private var headerSection: some View {
        VStack(spacing: DesignTokens.Spacing.sm) {
            Spacer().frame(height: DesignTokens.Spacing.xxl)

            Image(systemName: "moon.stars.fill")
                .font(.system(size: 44))
                .foregroundStyle(DesignTokens.Colors.primary)
                .symbolEffect(.pulse, options: .repeating)

            Text(greeting)
                .font(DesignTokens.Fonts.largeTitle)
                .foregroundStyle(DesignTokens.Colors.textPrimary)

            Text("Ready for a bedtime story?")
                .font(DesignTokens.Fonts.body)
                .foregroundStyle(DesignTokens.Colors.textSecondary)

            Spacer().frame(height: DesignTokens.Spacing.lg)

            SnoozyButton(title: "New Story", icon: "plus") {
                onNewStory()
            }

            Spacer().frame(height: DesignTokens.Spacing.xl)
        }
    }

    // MARK: - Stories List

    private var storiesSection: some View {
        Group {
            if savedStories.isEmpty {
                emptyState
            } else {
                storyList
            }
        }
    }

    private var emptyState: some View {
        VStack(spacing: DesignTokens.Spacing.md) {
            Spacer()
            Image(systemName: "book.closed.fill")
                .font(.system(size: 36))
                .foregroundStyle(DesignTokens.Colors.textSecondary.opacity(0.5))
            Text("No stories yet")
                .font(DesignTokens.Fonts.headline)
                .foregroundStyle(DesignTokens.Colors.textSecondary)
            Text("Create your first bedtime story!")
                .font(DesignTokens.Fonts.caption)
                .foregroundStyle(DesignTokens.Colors.textSecondary.opacity(0.7))
            Spacer()
        }
    }

    private var storyList: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            Text("Your Stories")
                .font(DesignTokens.Fonts.headline)
                .foregroundStyle(DesignTokens.Colors.textPrimary)

            ScrollView(showsIndicators: false) {
                LazyVStack(spacing: DesignTokens.Spacing.sm) {
                    ForEach(savedStories) { story in
                        StoryRow(
                            story: story,
                            onPlay: onPlayStory,
                            onDelete: onDeleteStory,
                            onRetry: onRetryStory
                        )
                    }
                }
            }
            .scrollClipDisabled()
        }
    }

    // MARK: - Time-Based Greeting

    private var greeting: String {
        let hour = Calendar.current.component(.hour, from: Date())
        switch hour {
        case 5..<12: return "Good Morning"
        case 12..<17: return "Good Afternoon"
        case 17..<21: return "Good Evening"
        default: return "Sleepy Time"
        }
    }
}
