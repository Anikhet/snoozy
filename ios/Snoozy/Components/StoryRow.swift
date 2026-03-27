import SwiftUI

/// A row in the saved stories list on the home screen.
struct StoryRow: View {
    let story: Story
    let onPlay: (Story) -> Void
    let onDelete: (Story) -> Void

    var body: some View {
        HStack(spacing: DesignTokens.Spacing.md) {
            templateIcon

            VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
                Text(story.title)
                    .font(DesignTokens.Fonts.headline)
                    .foregroundStyle(DesignTokens.Colors.textPrimary)
                    .lineLimit(1)

                Text("For \(story.childName) \u{2022} \(formattedDate)")
                    .font(DesignTokens.Fonts.caption)
                    .foregroundStyle(DesignTokens.Colors.textSecondary)
            }

            Spacer()

            Button { onPlay(story) } label: {
                Image(systemName: "play.fill")
                    .font(.body)
                    .foregroundStyle(DesignTokens.Colors.primary)
                    .frame(width: 40, height: 40)
                    .background(DesignTokens.Colors.primary.opacity(0.12))
                    .clipShape(.circle)
            }
        }
        .padding(DesignTokens.Spacing.md)
        .background(DesignTokens.Colors.surface)
        .clipShape(.rect(cornerRadius: DesignTokens.Radii.small))
        .snoozyCardShadow()
        .swipeActions(edge: .trailing) {
            Button(role: .destructive) { onDelete(story) } label: {
                Label("Delete", systemImage: "trash")
            }
        }
    }

    private var templateIcon: some View {
        let template = Templates.all.first { $0.id == story.templateId }
        return Image(systemName: template?.icon ?? "book.fill")
            .font(.title3)
            .foregroundStyle(DesignTokens.Colors.secondary)
            .frame(width: 40, height: 40)
    }

    private var formattedDate: String {
        let formatter = RelativeDateTimeFormatter()
        formatter.unitsStyle = .short
        return formatter.localizedString(for: story.createdAt, relativeTo: Date())
    }
}
