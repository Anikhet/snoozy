import SwiftUI

/// Loading screen shown during story + audio generation (15-30 seconds).
/// Displays an animated moon with twinkling stars and phase-aware status text.
struct GeneratingView: View {
    let childName: String
    let phase: GeneratingPhase

    @State private var moonScale: CGFloat = 0.8
    @State private var starOpacity: Double = 0.3

    var body: some View {
        VStack(spacing: DesignTokens.Spacing.xl) {
            Spacer()
            moonAnimation
            phaseText
            Spacer()
            Spacer()
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
        .onAppear {
            withAnimation(.easeInOut(duration: 2.0).repeatForever(autoreverses: true)) {
                moonScale = 1.0
            }
            withAnimation(.easeInOut(duration: 1.5).repeatForever(autoreverses: true)) {
                starOpacity = 1.0
            }
        }
    }

    // MARK: - Moon + Stars

    private var moonAnimation: some View {
        ZStack {
            ForEach(0..<5, id: \.self) { index in
                Image(systemName: "sparkle")
                    .font(.system(size: starSize(for: index)))
                    .foregroundStyle(DesignTokens.Colors.secondary)
                    .opacity(starOpacity)
                    .offset(starOffset(for: index))
            }

            Image(systemName: "moon.fill")
                .font(.system(size: 80))
                .foregroundStyle(DesignTokens.Colors.secondary)
                .scaleEffect(moonScale)
        }
        .frame(height: 160)
    }

    // MARK: - Phase Text

    private var phaseText: some View {
        VStack(spacing: DesignTokens.Spacing.sm) {
            Text(phaseMessage)
                .font(DesignTokens.Fonts.title)
                .foregroundStyle(DesignTokens.Colors.textPrimary)
                .multilineTextAlignment(.center)
                .contentTransition(.numericText())
                .animation(.easeInOut, value: phase)

            Text(phaseSubtext)
                .font(DesignTokens.Fonts.body)
                .foregroundStyle(DesignTokens.Colors.textSecondary)
                .multilineTextAlignment(.center)
        }
    }

    private var phaseMessage: String {
        switch phase {
        case .writingStory: return "Writing a story\nfor \(childName)..."
        case .generatingAudio: return "Adding a soothing\nvoice..."
        }
    }

    private var phaseSubtext: String {
        switch phase {
        case .writingStory: return "Imagining something special"
        case .generatingAudio: return "Almost ready for bedtime"
        }
    }

    // MARK: - Star Helpers

    private func starSize(for index: Int) -> CGFloat {
        [14, 10, 16, 12, 11][index]
    }

    private func starOffset(for index: Int) -> CGSize {
        let offsets: [CGSize] = [
            CGSize(width: -60, height: -50),
            CGSize(width: 55, height: -40),
            CGSize(width: -40, height: 50),
            CGSize(width: 65, height: 30),
            CGSize(width: 10, height: -65),
        ]
        return offsets[index]
    }
}
