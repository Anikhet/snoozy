import SwiftUI

/// Audio player screen with playback controls, scrubber, sleep timer, and scrollable story text.
struct StoryPlayerView: View {
    let story: Story
    let audioService: AudioService
    let onDone: () -> Void

    @State private var showTimerPicker = false

    var body: some View {
        VStack(spacing: 0) {
            header
            playerControls
            sleepTimerBar
            storyText
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    // MARK: - Header

    private var header: some View {
        VStack(spacing: DesignTokens.Spacing.md) {
            HStack {
                Button(action: handleDone) {
                    Image(systemName: "xmark")
                        .font(.title3.weight(.medium))
                        .foregroundStyle(DesignTokens.Colors.textSecondary)
                }
                Spacer()
            }

            Text(story.title)
                .font(DesignTokens.Fonts.title)
                .foregroundStyle(DesignTokens.Colors.textPrimary)
                .multilineTextAlignment(.center)

            Text("A story for \(story.childName)")
                .font(DesignTokens.Fonts.caption)
                .foregroundStyle(DesignTokens.Colors.textSecondary)
        }
        .padding(.top, DesignTokens.Spacing.lg)
    }

    // MARK: - Player Controls

    private var playerControls: some View {
        VStack(spacing: DesignTokens.Spacing.md) {
            Spacer().frame(height: DesignTokens.Spacing.lg)

            progressBar

            timeLabels

            HStack(spacing: DesignTokens.Spacing.xl) {
                seekButton(seconds: -15, icon: "gobackward.15")
                playPauseButton
                seekButton(seconds: 15, icon: "goforward.15")
            }

            Spacer().frame(height: DesignTokens.Spacing.md)
        }
    }

    private var progressBar: some View {
        GeometryReader { geo in
            ZStack(alignment: .leading) {
                Capsule()
                    .fill(DesignTokens.Colors.surface)
                    .frame(height: 6)

                Capsule()
                    .fill(DesignTokens.Colors.primary)
                    .frame(width: progressWidth(totalWidth: geo.size.width), height: 6)
            }
            .gesture(
                DragGesture(minimumDistance: 0)
                    .onChanged { value in
                        let fraction = max(0, min(1, value.location.x / geo.size.width))
                        audioService.seek(to: fraction * audioService.duration)
                    }
            )
        }
        .frame(height: 6)
    }

    private var timeLabels: some View {
        HStack {
            Text(formatTime(audioService.currentTime))
                .font(DesignTokens.Fonts.caption)
                .foregroundStyle(DesignTokens.Colors.textSecondary)
            Spacer()
            Text(formatTime(audioService.duration))
                .font(DesignTokens.Fonts.caption)
                .foregroundStyle(DesignTokens.Colors.textSecondary)
        }
    }

    private var playPauseButton: some View {
        Button(action: audioService.togglePlayPause) {
            Image(systemName: audioService.isPlaying ? "pause.circle.fill" : "play.circle.fill")
                .font(.system(size: 64))
                .foregroundStyle(DesignTokens.Colors.primary)
                .contentTransition(.symbolEffect(.replace))
        }
    }

    private func seekButton(seconds: TimeInterval, icon: String) -> some View {
        Button {
            let newTime = max(0, min(audioService.duration, audioService.currentTime + seconds))
            audioService.seek(to: newTime)
        } label: {
            Image(systemName: icon)
                .font(.system(size: 28))
                .foregroundStyle(DesignTokens.Colors.textSecondary)
        }
    }

    // MARK: - Sleep Timer

    private var sleepTimerBar: some View {
        VStack(spacing: DesignTokens.Spacing.sm) {
            if audioService.isSleepTimerActive, let remaining = audioService.sleepTimerRemaining {
                HStack(spacing: DesignTokens.Spacing.sm) {
                    Image(systemName: "moon.zzz.fill")
                        .font(.caption)
                    Text("Sleep in \(formatTime(remaining))")
                        .font(DesignTokens.Fonts.caption)
                    Spacer()
                    Button("Cancel") {
                        audioService.cancelSleepTimer()
                    }
                    .font(DesignTokens.Fonts.caption)
                }
                .foregroundStyle(DesignTokens.Colors.primary)
                .padding(.horizontal, DesignTokens.Spacing.md)
                .padding(.vertical, DesignTokens.Spacing.sm)
                .background(DesignTokens.Colors.primary.opacity(0.1))
                .clipShape(.rect(cornerRadius: DesignTokens.Radii.small))
            } else {
                Button {
                    showTimerPicker.toggle()
                } label: {
                    HStack(spacing: DesignTokens.Spacing.xs) {
                        Image(systemName: "moon.zzz")
                            .font(.caption)
                        Text("Sleep Timer")
                            .font(DesignTokens.Fonts.caption)
                    }
                    .foregroundStyle(DesignTokens.Colors.textSecondary)
                }
            }

            if showTimerPicker {
                timerOptions
            }
        }
        .padding(.vertical, DesignTokens.Spacing.sm)
    }

    private var timerOptions: some View {
        HStack(spacing: DesignTokens.Spacing.sm) {
            ForEach(AudioService.timerOptions, id: \.label) { option in
                Button {
                    audioService.startSleepTimer(seconds: option.seconds)
                    showTimerPicker = false
                } label: {
                    Text(option.label)
                        .font(DesignTokens.Fonts.caption)
                        .padding(.horizontal, DesignTokens.Spacing.sm)
                        .padding(.vertical, DesignTokens.Spacing.xs)
                        .background(DesignTokens.Colors.surface)
                        .clipShape(.rect(cornerRadius: DesignTokens.Radii.small))
                        .snoozyCardShadow()
                }
                .foregroundStyle(DesignTokens.Colors.textPrimary)
            }
        }
    }

    // MARK: - Story Text

    private var storyText: some View {
        ScrollView(showsIndicators: false) {
            Text(story.storyText)
                .font(DesignTokens.Fonts.body)
                .foregroundStyle(DesignTokens.Colors.textPrimary)
                .lineSpacing(6)
                .padding(.vertical, DesignTokens.Spacing.md)
        }
    }

    // MARK: - Helpers

    private func progressWidth(totalWidth: CGFloat) -> CGFloat {
        guard audioService.duration > 0 else { return 0 }
        return totalWidth * (audioService.currentTime / audioService.duration)
    }

    private func formatTime(_ time: TimeInterval) -> String {
        let minutes = Int(time) / 60
        let seconds = Int(time) % 60
        return String(format: "%d:%02d", minutes, seconds)
    }

    private func handleDone() {
        audioService.stop()
        onDone()
    }
}
