import SwiftUI

/// Premium home — editorial greeting, "tonight's ritual" CTA, story library.
struct HomeView: View {
    let savedStories: [Story]
    let onNewStory: () -> Void
    let onPlayStory: (Story) -> Void
    let onDeleteStory: (Story) -> Void
    let onRetryStory: (Story) -> Void

    var body: some View {
        ScrollView(showsIndicators: false) {
            VStack(alignment: .leading, spacing: 0) {
                topBar
                greetingHero
                    .padding(.top, 20)
                newStoryCTA
                    .padding(.top, 18)
                libraryHeader
                    .padding(.top, 24)
                libraryList
                    .padding(.top, 8)
                Spacer().frame(height: DesignTokens.Spacing.xxl)
            }
        }
        .scrollClipDisabled()
        .background(DesignTokens.Colors.background)
    }

    // MARK: - Top bar

    private var topBar: some View {
        HStack {
            ZStack {
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .fill(DesignTokens.Colors.surface)
                    .overlay(
                        RoundedRectangle(cornerRadius: 12, style: .continuous)
                            .stroke(DesignTokens.Colors.hair, lineWidth: 1)
                    )
                Text("s")
                    .font(.system(size: 20, weight: .semibold, design: .serif))
                    .italic()
                    .foregroundStyle(DesignTokens.Colors.primary)
            }
            .frame(width: 38, height: 38)

            Spacer()

            Circle()
                .fill(
                    LinearGradient(
                        colors: [DesignTokens.Colors.accent, DesignTokens.Colors.gold],
                        startPoint: .topLeading, endPoint: .bottomTrailing
                    )
                )
                .frame(width: 38, height: 38)
                .overlay(
                    Circle().stroke(DesignTokens.Colors.surface, lineWidth: 2)
                )
                .shadow(color: DesignTokens.Colors.ink.opacity(0.1), radius: 6, x: 0, y: 2)
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
        .padding(.top, 12)
    }

    // MARK: - Greeting hero

    private var greetingHero: some View {
        ZStack(alignment: .topTrailing) {
            VStack(alignment: .leading, spacing: 6) {
                Text(dayEyebrow.uppercased())
                    .font(DesignTokens.Fonts.eyebrow)
                    .kerning(2)
                    .foregroundStyle(DesignTokens.Colors.inkMute)

                VStack(alignment: .leading, spacing: 0) {
                    Text("\(greetingLead),")
                        .font(.system(size: 38, weight: .regular, design: .serif))
                        .kerning(-0.8)
                        .foregroundStyle(DesignTokens.Colors.ink)
                    Text("what shall we")
                        .font(.system(size: 38, weight: .regular, design: .serif))
                        .italic()
                        .kerning(-0.8)
                        .foregroundStyle(DesignTokens.Colors.primary)
                    Text("dream of tonight?")
                        .font(.system(size: 38, weight: .regular, design: .serif))
                        .italic()
                        .kerning(-0.8)
                        .foregroundStyle(DesignTokens.Colors.primary)
                }
                .lineSpacing(-4)
            }

            Constellation(color: DesignTokens.Colors.primary, opacity: 0.4)
                .offset(x: -8, y: -4)
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    // MARK: - New story CTA

    private var newStoryCTA: some View {
        Button(action: onNewStory) {
            HStack(spacing: DesignTokens.Spacing.md) {
                VStack(alignment: .leading, spacing: 2) {
                    Text("TONIGHT'S RITUAL")
                        .font(DesignTokens.Fonts.eyebrow)
                        .kerning(2)
                        .foregroundStyle(DesignTokens.Colors.accent)
                    Text("Write a new story")
                        .font(.system(size: 20, weight: .medium, design: .serif))
                        .foregroundStyle(DesignTokens.Colors.background)
                }
                Spacer()
                ZStack {
                    Circle().fill(DesignTokens.Colors.accent)
                    Text("→")
                        .font(.system(size: 20, weight: .bold, design: .rounded))
                        .foregroundStyle(DesignTokens.Colors.ink)
                }
                .frame(width: 40, height: 40)
            }
            .padding(.horizontal, 20)
            .frame(height: 64)
            .background(
                LinearGradient(
                    colors: [DesignTokens.Colors.ink, Color.hex(0x3D3142)],
                    startPoint: .topLeading, endPoint: .bottomTrailing
                )
            )
            .clipShape(.rect(cornerRadius: 20))
            .snoozyLiftShadow()
        }
        .buttonStyle(.plain)
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    // MARK: - Library

    private var libraryHeader: some View {
        HStack(alignment: .firstTextBaseline) {
            Text("Your library")
                .font(.system(size: 20, weight: .medium, design: .serif))
                .italic()
                .foregroundStyle(DesignTokens.Colors.ink)
            Spacer()
            Text(savedStories.isEmpty ? "No stories yet" : "\(savedStories.count) \(savedStories.count == 1 ? "story" : "stories")")
                .font(.system(size: 12, weight: .semibold, design: .rounded))
                .foregroundStyle(DesignTokens.Colors.inkSoft)
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    @ViewBuilder
    private var libraryList: some View {
        if savedStories.isEmpty {
            emptyState
                .padding(.horizontal, DesignTokens.Spacing.lg)
        } else {
            LazyVStack(spacing: 10) {
                ForEach(savedStories) { story in
                    StoryRow(
                        story: story,
                        onPlay: onPlayStory,
                        onDelete: onDeleteStory,
                        onRetry: onRetryStory
                    )
                }
            }
            .padding(.horizontal, DesignTokens.Spacing.lg)
        }
    }

    private var emptyState: some View {
        VStack(spacing: 10) {
            IllustrationPlaceholder(
                palette: [
                    DesignTokens.Colors.cardLavender,
                    DesignTokens.Colors.cardCosmos,
                    DesignTokens.Colors.primarySoft
                ],
                label: "library illustration",
                seed: 1
            )
            .frame(height: 120)
            .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))

            Text("Your stories will gather here — like a little bedside shelf.")
                .font(.system(size: 14, design: .rounded))
                .foregroundStyle(DesignTokens.Colors.inkSoft)
                .multilineTextAlignment(.center)
                .padding(.top, 4)
        }
        .padding(.vertical, 16)
    }

    // MARK: - Copy helpers

    private var greetingLead: String {
        let hour = Calendar.current.component(.hour, from: Date())
        switch hour {
        case 5..<12: return "Good morning"
        case 12..<17: return "Good afternoon"
        case 17..<22: return "Good evening"
        default:      return "Sleepy time"
        }
    }

    private var dayEyebrow: String {
        let fmt = DateFormatter()
        fmt.dateFormat = "EEEE, "
        let now = Date()
        let hour = Calendar.current.component(.hour, from: now)
        let moment: String
        switch hour {
        case 5..<12: moment = "Morning"
        case 12..<17: moment = "Afternoon"
        case 17..<22: moment = "Evening"
        default: moment = "Night"
        }
        return fmt.string(from: now) + moment
    }
}
