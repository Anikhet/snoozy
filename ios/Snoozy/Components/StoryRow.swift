import SwiftUI

/// A row in the saved stories list. Premium redesign uses a gradient thumb
/// with the template's serif glyph, editorial title, play pill trailing.
struct StoryRow: View {
    let story: Story
    let onPlay: (Story) -> Void
    let onDelete: (Story) -> Void
    let onRetry: (Story) -> Void

    var body: some View {
        Button(action: handleTap) {
            HStack(spacing: DesignTokens.Spacing.md) {
                thumb
                titleSection
                Spacer(minLength: 0)
                trailingAction
            }
            .padding(12)
            .background(DesignTokens.Colors.surface)
            .clipShape(.rect(cornerRadius: DesignTokens.Radii.card))
            .overlay(
                RoundedRectangle(cornerRadius: DesignTokens.Radii.card, style: .continuous)
                    .stroke(DesignTokens.Colors.hair, lineWidth: 1)
            )
            .shadow(color: DesignTokens.Colors.ink.opacity(0.03), radius: 6, x: 0, y: 2)
        }
        .buttonStyle(.plain)
        .disabled(story.status == .generating)
    }

    // MARK: - Thumb (gradient + serif glyph)

    private var template: Template? {
        Templates.all.first { $0.id == story.templateId }
    }

    private var thumb: some View {
        let t = template
        return ZStack {
            LinearGradient(
                colors: t?.gradient ?? [DesignTokens.Colors.cardLavender, DesignTokens.Colors.cardCosmos],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            Text(t?.glyph ?? "\u{2726}")
                .font(.system(size: 22, weight: .regular, design: .serif))
                .foregroundStyle(DesignTokens.Colors.ink)
        }
        .frame(width: 56, height: 56)
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
    }

    // MARK: - Title & Subtitle

    private var titleSection: some View {
        VStack(alignment: .leading, spacing: 3) {
            Text(story.title)
                .font(.system(size: 16, weight: .medium, design: .serif))
                .kerning(-0.2)
                .foregroundStyle(DesignTokens.Colors.ink)
                .lineLimit(1)

            subtitleView
        }
    }

    @ViewBuilder
    private var subtitleView: some View {
        switch story.status {
        case .generating:
            HStack(spacing: 6) {
                ProgressView().controlSize(.mini).tint(DesignTokens.Colors.primary)
                Text("Weaving the story…")
                    .font(.system(size: 12, design: .rounded))
                    .foregroundStyle(DesignTokens.Colors.primary)
            }

        case .ready:
            HStack(spacing: 6) {
                Text(forWhom)
                    .font(.system(size: 12, design: .rounded))
                    .foregroundStyle(DesignTokens.Colors.inkSoft)
                Circle()
                    .fill(DesignTokens.Colors.inkMute)
                    .frame(width: 3, height: 3)
                Text(formattedDate)
                    .font(.system(size: 12, design: .rounded))
                    .foregroundStyle(DesignTokens.Colors.inkSoft)
            }

        case .failed:
            Text("Didn't quite come together — tap to retry")
                .font(.system(size: 12, design: .rounded))
                .foregroundStyle(DesignTokens.Colors.error)
                .lineLimit(1)
        }
    }

    private var forWhom: String {
        "For \(story.childName)"
    }

    // MARK: - Trailing Action

    @ViewBuilder
    private var trailingAction: some View {
        switch story.status {
        case .generating:
            ProgressView()
                .controlSize(.small)
                .tint(DesignTokens.Colors.primary)
                .frame(width: 40, height: 40)

        case .ready:
            ZStack {
                Circle().fill(DesignTokens.Colors.primarySoft)
                // small serif-style play triangle
                Triangle()
                    .fill(DesignTokens.Colors.primary)
                    .frame(width: 10, height: 12)
                    .offset(x: 1)
            }
            .frame(width: 40, height: 40)

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
        let f = RelativeDateTimeFormatter()
        f.unitsStyle = .short
        return f
    }()

    private var formattedDate: String {
        Self.dateFormatter.localizedString(for: story.createdAt, relativeTo: Date())
    }
}

/// Right-pointing triangle — used as a minimal play glyph.
struct Triangle: Shape {
    func path(in rect: CGRect) -> Path {
        var p = Path()
        p.move(to: CGPoint(x: rect.minX, y: rect.minY))
        p.addLine(to: CGPoint(x: rect.maxX, y: rect.midY))
        p.addLine(to: CGPoint(x: rect.minX, y: rect.maxY))
        p.closeSubpath()
        return p
    }
}
