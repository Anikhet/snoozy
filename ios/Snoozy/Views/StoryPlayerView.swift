import SwiftUI

/// Player — ambient in light mode, "dreaming" hero in dark mode.
/// Waveform scrubber instead of a flat bar; sleep timer chip/drawer.
struct StoryPlayerView: View {
    let story: Story
    let audioService: AudioService
    let onDone: () -> Void

    @Environment(\.colorScheme) private var scheme
    @State private var showTimerPicker = false

    private var isNight: Bool { scheme == .dark }

    var body: some View {
        ZStack {
            background.ignoresSafeArea()

            ScrollView(showsIndicators: false) {
                VStack(spacing: 0) {
                    header
                    heroArea
                        .padding(.top, 22)
                    titleBlock
                        .padding(.top, 22)
                    scrubberBlock
                        .padding(.top, 22)
                    controls
                        .padding(.top, 20)
                    sleepTimerBlock
                        .padding(.top, 22)
                    storyText
                        .padding(.top, 28)
                }
                .padding(.bottom, 40)
            }
            .scrollClipDisabled()
        }
    }

    // MARK: - Background

    @ViewBuilder
    private var background: some View {
        if isNight {
            RadialGradient(
                colors: [DesignTokens.Colors.night, DesignTokens.Colors.nightDeep],
                center: .top,
                startRadius: 0,
                endRadius: 900
            )
            .overlay(
                ZStack {
                    Circle()
                        .fill(DesignTokens.Colors.primary.opacity(0.35))
                        .frame(width: 260, height: 260)
                        .blur(radius: 70)
                        .offset(x: -140, y: -300)
                    Circle()
                        .fill(DesignTokens.Colors.accent.opacity(0.22))
                        .frame(width: 300, height: 300)
                        .blur(radius: 80)
                        .offset(x: 150, y: -180)
                }
            )
            .overlay(ambientStars)
        } else {
            DesignTokens.Colors.background
        }
    }

    private var ambientStars: some View {
        GeometryReader { geo in
            ZStack {
                ForEach(0..<32, id: \.self) { i in
                    let x = CGFloat((i * 53 + 17) % Int(max(1, geo.size.width)))
                    let y = CGFloat((i * 37 + 11) % Int(max(1, geo.size.height)))
                    let s = 1 + CGFloat(i % 4) * 0.6
                    SnoozyStar(size: s * 2, color: .white, opacity: 0.3 + Double(i % 5) * 0.12)
                        .position(x: x, y: y)
                }
            }
        }
    }

    // MARK: - Header

    private var header: some View {
        HStack {
            button(system: "xmark", action: handleDone)
            Spacer()
            Text(isNight ? "DREAMING" : "NOW PLAYING")
                .font(DesignTokens.Fonts.eyebrow)
                .kerning(2)
                .foregroundStyle(inkSoft)
            Spacer()
            button(system: "heart", action: {})
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
        .padding(.top, 8)
    }

    private func button(system: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            ZStack {
                if isNight {
                    Circle()
                        .fill(Color.white.opacity(0.08))
                        .overlay(Circle().stroke(DesignTokens.Colors.nightHair, lineWidth: 1))
                } else {
                    Circle()
                        .fill(DesignTokens.Colors.surface)
                        .overlay(Circle().stroke(DesignTokens.Colors.hair, lineWidth: 1))
                }
                Image(systemName: system)
                    .font(.system(size: 14, weight: .medium))
                    .foregroundStyle(ink)
            }
            .frame(width: 38, height: 38)
        }
        .buttonStyle(.plain)
    }

    // MARK: - Hero (cover illustration in light, moon in night)

    @ViewBuilder
    private var heroArea: some View {
        if isNight {
            ZStack {
                DreamingMoon(size: 196)
            }
            .frame(maxWidth: .infinity)
            .padding(.top, 20)
        } else {
            CoverScene()
                .frame(height: 280)
                .clipShape(RoundedRectangle(cornerRadius: 28, style: .continuous))
                .shadow(color: DesignTokens.Colors.ink.opacity(0.12), radius: 30, x: 0, y: 20)
                .padding(.horizontal, DesignTokens.Spacing.lg)
        }
    }

    // MARK: - Title

    private var titleBlock: some View {
        VStack(spacing: 6) {
            Text((isNight ? "A chapter for " : "A story for ").uppercased() + story.childName.uppercased())
                .font(DesignTokens.Fonts.eyebrow)
                .kerning(2)
                .foregroundStyle(inkSoft)

            titleLines
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    private var titleLines: some View {
        let words = story.title.split(separator: " ", maxSplits: 1, omittingEmptySubsequences: false)
        let first = words.first.map(String.init) ?? story.title
        let rest = words.count > 1 ? String(words[1]) : ""
        return VStack(spacing: 2) {
            Text(first)
                .font(.system(size: 26, weight: .medium, design: .serif))
                .italic()
                .foregroundStyle(ink)
            if !rest.isEmpty {
                Text(rest)
                    .font(.system(size: 26, weight: .medium, design: .serif))
                    .foregroundStyle(ink)
            }
        }
        .kerning(-0.4)
    }

    // MARK: - Scrubber

    private var scrubberBlock: some View {
        VStack(spacing: 8) {
            GeometryReader { geo in
                WaveformScrubber(
                    progress: progress,
                    bars: isNight ? 56 : 48,
                    activeColor: isNight ? DesignTokens.Colors.nightInk : DesignTokens.Colors.primary,
                    inactiveColor: isNight
                        ? DesignTokens.Colors.nightInk.opacity(0.22)
                        : DesignTokens.Colors.ink.opacity(0.14),
                    height: 38
                )
                .contentShape(Rectangle())
                .gesture(
                    DragGesture(minimumDistance: 0)
                        .onChanged { value in
                            let f = max(0, min(1, value.location.x / geo.size.width))
                            audioService.seek(to: f * audioService.duration)
                        }
                )
            }
            .frame(height: 40)

            HStack {
                Text(formatTime(audioService.currentTime))
                    .font(DesignTokens.Fonts.mono)
                    .foregroundStyle(inkSoft)
                Spacer()
                Text(formatRemaining())
                    .font(DesignTokens.Fonts.mono)
                    .foregroundStyle(inkSoft)
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    // MARK: - Controls

    private var controls: some View {
        HStack(spacing: 24) {
            seekButton(seconds: -15, label: "−15")
            playPauseButton
            seekButton(seconds: 15, label: "+15")
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    private func seekButton(seconds: TimeInterval, label: String) -> some View {
        Button {
            let t = max(0, min(audioService.duration, audioService.currentTime + seconds))
            audioService.seek(to: t)
        } label: {
            Text(label)
                .font(.system(size: 13, weight: .bold, design: .monospaced))
                .foregroundStyle(ink)
                .frame(width: 52, height: 52)
                .background(
                    Group {
                        if isNight {
                            RoundedRectangle(cornerRadius: 16, style: .continuous)
                                .fill(Color.white.opacity(0.06))
                                .overlay(
                                    RoundedRectangle(cornerRadius: 16, style: .continuous)
                                        .stroke(DesignTokens.Colors.nightHair, lineWidth: 1)
                                )
                        } else {
                            RoundedRectangle(cornerRadius: 14, style: .continuous)
                                .fill(Color.clear)
                        }
                    }
                )
        }
        .buttonStyle(.plain)
    }

    private var playPauseButton: some View {
        Button(action: audioService.togglePlayPause) {
            ZStack {
                Circle()
                    .fill(
                        isNight
                            ? AnyShapeStyle(
                                LinearGradient(
                                    colors: [Color.hex(0xF9F2E4), DesignTokens.Colors.accent],
                                    startPoint: .topLeading, endPoint: .bottomTrailing
                                )
                              )
                            : AnyShapeStyle(
                                LinearGradient(
                                    colors: [DesignTokens.Colors.ink, Color.hex(0x3D3142)],
                                    startPoint: .topLeading, endPoint: .bottomTrailing
                                )
                              )
                    )
                    .overlay(
                        Circle().fill(.white.opacity(0.6)).blendMode(.plusLighter)
                            .frame(width: 4, height: 4).offset(y: -36)
                    )

                if audioService.isPlaying {
                    HStack(spacing: 4) {
                        Capsule().frame(width: 5, height: 22)
                        Capsule().frame(width: 5, height: 22)
                    }
                    .foregroundStyle(isNight ? DesignTokens.Colors.night : DesignTokens.Colors.background)
                } else {
                    Triangle()
                        .fill(isNight ? DesignTokens.Colors.night : DesignTokens.Colors.background)
                        .frame(width: 18, height: 22)
                        .offset(x: 2)
                }
            }
            .frame(width: isNight ? 80 : 72, height: isNight ? 80 : 72)
            .shadow(
                color: isNight
                    ? DesignTokens.Colors.accent.opacity(0.45)
                    : DesignTokens.Colors.ink.opacity(0.32),
                radius: isNight ? 22 : 18, x: 0, y: 12
            )
        }
        .buttonStyle(.plain)
    }

    // MARK: - Sleep timer

    @ViewBuilder
    private var sleepTimerBlock: some View {
        if isNight {
            nightSleepDrawer
                .padding(.horizontal, DesignTokens.Spacing.lg)
        } else {
            HStack {
                Spacer()
                if audioService.isSleepTimerActive, let remaining = audioService.sleepTimerRemaining {
                    sleepTimerActiveChip(remaining: remaining)
                } else {
                    sleepTimerIdle
                }
                Spacer()
            }
        }
    }

    private var sleepTimerIdle: some View {
        VStack(spacing: 10) {
            Button {
                withAnimation(.easeInOut(duration: 0.2)) { showTimerPicker.toggle() }
            } label: {
                HStack(spacing: 8) {
                    ZStack {
                        Circle().fill(DesignTokens.Colors.primary)
                        Text("\u{263E}")
                            .font(.system(size: 11, weight: .semibold))
                            .foregroundStyle(.white)
                    }
                    .frame(width: 22, height: 22)
                    Text("Sleep timer")
                        .font(.system(size: 12, weight: .bold, design: .rounded))
                        .foregroundStyle(DesignTokens.Colors.primaryInk)
                }
                .padding(.horizontal, 14)
                .padding(.vertical, 10)
                .background(Capsule().fill(DesignTokens.Colors.primarySoft))
            }
            .buttonStyle(.plain)

            if showTimerPicker {
                HStack(spacing: 8) {
                    ForEach(AudioService.timerOptions, id: \.label) { opt in
                        Button {
                            audioService.startSleepTimer(seconds: opt.seconds)
                            withAnimation { showTimerPicker = false }
                        } label: {
                            Text(opt.label)
                                .font(.system(size: 12, weight: .semibold, design: .rounded))
                                .foregroundStyle(DesignTokens.Colors.ink)
                                .padding(.horizontal, 12)
                                .padding(.vertical, 8)
                                .background(DesignTokens.Colors.surface)
                                .clipShape(Capsule())
                                .overlay(Capsule().stroke(DesignTokens.Colors.hair, lineWidth: 1))
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
        }
    }

    private func sleepTimerActiveChip(remaining: TimeInterval) -> some View {
        HStack(spacing: 8) {
            ZStack {
                Circle().fill(DesignTokens.Colors.primary)
                Text("\u{263E}")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundStyle(.white)
            }
            .frame(width: 22, height: 22)
            Text("Sleep timer · \(formatTime(remaining))")
                .font(.system(size: 12, weight: .bold, design: .rounded))
                .foregroundStyle(DesignTokens.Colors.primaryInk)
            Button {
                audioService.cancelSleepTimer()
            } label: {
                Image(systemName: "xmark")
                    .font(.system(size: 10, weight: .bold))
                    .foregroundStyle(DesignTokens.Colors.primaryInk.opacity(0.6))
            }
            .buttonStyle(.plain)
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 10)
        .background(Capsule().fill(DesignTokens.Colors.primarySoft))
    }

    private var nightSleepDrawer: some View {
        HStack(spacing: 12) {
            ZStack {
                LinearGradient(
                    colors: [DesignTokens.Colors.primary, DesignTokens.Colors.accent],
                    startPoint: .topLeading, endPoint: .bottomTrailing
                )
                Text("\u{263E}")
                    .font(.system(size: 14))
                    .foregroundStyle(.white)
            }
            .frame(width: 34, height: 34)
            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))

            VStack(alignment: .leading, spacing: 2) {
                Text("SLEEP TIMER")
                    .font(.system(size: 10, weight: .bold, design: .rounded))
                    .kerning(1.4)
                    .foregroundStyle(DesignTokens.Colors.nightInkSoft)
                Text(nightSleepCopy)
                    .font(.system(size: 16, weight: .regular, design: .serif))
                    .italic()
                    .foregroundStyle(DesignTokens.Colors.nightInk)
            }

            Spacer()

            Button {
                withAnimation { showTimerPicker.toggle() }
            } label: {
                Text("Edit")
                    .font(.system(size: 11, weight: .bold, design: .rounded))
                    .foregroundStyle(DesignTokens.Colors.nightInk)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
                    .background(Capsule().fill(Color.white.opacity(0.1)))
            }
            .buttonStyle(.plain)
        }
        .padding(16)
        .background(
            RoundedRectangle(cornerRadius: 22, style: .continuous)
                .fill(Color.white.opacity(0.06))
                .overlay(
                    RoundedRectangle(cornerRadius: 22, style: .continuous)
                        .stroke(DesignTokens.Colors.nightHair, lineWidth: 1)
                )
        )
    }

    private var nightSleepCopy: String {
        if audioService.isSleepTimerActive, let remaining = audioService.sleepTimerRemaining {
            return "Fade out in \(formatTime(remaining))"
        }
        return "Tap edit to set a timer"
    }

    // MARK: - Story text

    private var storyText: some View {
        Text(story.storyText)
            .font(.system(size: 17, design: .serif))
            .foregroundStyle(ink)
            .lineSpacing(6)
            .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    // MARK: - Helpers

    private var progress: Double {
        guard audioService.duration > 0 else { return 0 }
        return max(0, min(1, audioService.currentTime / audioService.duration))
    }

    private var ink: Color { isNight ? DesignTokens.Colors.nightInk : DesignTokens.Colors.ink }
    private var inkSoft: Color { isNight ? DesignTokens.Colors.nightInkSoft : DesignTokens.Colors.inkSoft }

    private func formatTime(_ t: TimeInterval) -> String {
        let minutes = Int(t) / 60
        let seconds = Int(t) % 60
        return String(format: "%d:%02d", minutes, seconds)
    }

    private func formatRemaining() -> String {
        let remaining = max(0, audioService.duration - audioService.currentTime)
        if isNight {
            return "−" + formatTime(remaining)
        }
        return formatTime(audioService.duration)
    }

    private func handleDone() {
        audioService.stop()
        onDone()
    }
}
