import SwiftUI

/// A row in the saved stories list on the home screen.
/// Shows generating/ready/failed status with appropriate actions.
struct StoryRow: View {
    let story: Story
    let onPlay: (Story) -> Void
    let onDelete: (Story) -> Void
    let onRetry: (Story) -> Void

    var body: some View {
        Button(action: handleTap) {
            HStack(spacing: DesignTokens.Spacing.md) {
                templateIcon
                titleSection
                Spacer()
                trailingAction
            }
            .padding(DesignTokens.Spacing.md)
            .background(DesignTokens.Colors.surface)
            .clipShape(.rect(cornerRadius: DesignTokens.Radii.small))
            .snoozyCardShadow()
        }
        .buttonStyle(.plain)
        .disabled(story.status == .generating)
    }

    // MARK: - Icon

    private var templateIcon: some View {
        let template = Templates.all.first { $0.id == story.templateId }
        return Image(systemName: template?.icon ?? "book.fill")
            .font(.title3)
            .foregroundStyle(iconColor)
            .frame(width: 40, height: 40)
    }

    private var iconColor: Color {
        switch story.status {
        case .generating: return DesignTokens.Colors.secondary
        case .ready: return DesignTokens.Colors.secondary
        case .failed: return DesignTokens.Colors.error
        }
    }

    // MARK: - Title & Subtitle

    private var titleSection: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
            Text(story.title)
                .font(DesignTokens.Fonts.headline)
                .foregroundStyle(DesignTokens.Colors.textPrimary)
                .lineLimit(1)

            subtitleView
        }
    }

    @ViewBuilder
    private var subtitleView: some View {
        switch story.status {
        case .generating:
            HStack(spacing: DesignTokens.Spacing.xs) {
                ProgressView()
                    .controlSize(.mini)
                Text("Generating...")
                    .font(DesignTokens.Fonts.caption)
                    .foregroundStyle(DesignTokens.Colors.primary)
            }

        case .ready:
            Text("For \(story.childName) \u{2022} \(formattedDate)")
                .font(DesignTokens.Fonts.caption)
                .foregroundStyle(DesignTokens.Colors.textSecondary)

        case .failed:
            Text("Tap to retry")
                .font(DesignTokens.Fonts.caption)
                .foregroundStyle(DesignTokens.Colors.error)
        }
    }

    // MARK: - Trailing Action

    @ViewBuilder
    private var trailingAction: some View {
        switch story.status {
        case .generating:
            ProgressView()
                .controlSize(.small)
                .tint(DesignTokens.Colors.primary)

        case .ready:
            Image(systemName: "play.fill")
                .font(.body)
                .foregroundStyle(DesignTokens.Colors.primary)
                .frame(width: 40, height: 40)
                .background(DesignTokens.Colors.primary.opacity(0.12))
                .clipShape(.circle)

        case .failed:
            Image(systemName: "arrow.clockwise")
                .font(.body)
                .foregroundStyle(DesignTokens.Colors.error)
                .frame(width: 40, height: 40)
                .background(DesignTokens.Colors.error.opacity(0.12))
                .clipShape(.circle)
        }
    }

    // MARK: - Actions

    private func handleTap() {
        switch story.status {
        case .ready: onPlay(story)
        case .failed: onRetry(story)
        case .generating: break
        }
    }

    private static let dateFormatter: RelativeDateTimeFormatter = {
        let formatter = RelativeDateTimeFormatter()
        formatter.unitsStyle = .short
        return formatter
    }()

    private var formattedDate: String {
        Self.dateFormatter.localizedString(for: story.createdAt, relativeTo: Date())
    }
}
