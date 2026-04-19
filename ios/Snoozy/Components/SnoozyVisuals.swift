import SwiftUI

// MARK: - Star

/// A small 4-point sparkle glyph used as ambient decoration.
struct SnoozyStar: View {
    var size: CGFloat = 8
    var color: Color = DesignTokens.Colors.primary
    var opacity: Double = 1

    var body: some View {
        Canvas { ctx, canvasSize in
            let w = canvasSize.width
            let h = canvasSize.height
            var path = Path()
            path.move(to: CGPoint(x: w * 0.5, y: 0))
            path.addLine(to: CGPoint(x: w * 0.6, y: h * 0.4))
            path.addLine(to: CGPoint(x: w, y: h * 0.5))
            path.addLine(to: CGPoint(x: w * 0.6, y: h * 0.6))
            path.addLine(to: CGPoint(x: w * 0.5, y: h))
            path.addLine(to: CGPoint(x: w * 0.4, y: h * 0.6))
            path.addLine(to: CGPoint(x: 0, y: h * 0.5))
            path.addLine(to: CGPoint(x: w * 0.4, y: h * 0.4))
            path.closeSubpath()
            ctx.fill(path, with: .color(color.opacity(opacity)))
        }
        .frame(width: size, height: size)
    }
}

// MARK: - Constellation

/// Tiny dotted line with nodes — used behind home-screen greetings.
struct Constellation: View {
    var color: Color = DesignTokens.Colors.primary
    var opacity: Double = 0.4

    var body: some View {
        Canvas { ctx, size in
            let pts: [CGPoint] = [
                .init(x: 10, y: 20),
                .init(x: 40, y: 35),
                .init(x: 70, y: 15),
                .init(x: 95, y: 40),
                .init(x: 105, y: 65)
            ]
            let scaleX = size.width / 120
            let scaleY = size.height / 80
            let scaled = pts.map { CGPoint(x: $0.x * scaleX, y: $0.y * scaleY) }

            var line = Path()
            line.addLines(scaled)
            ctx.stroke(line, with: .color(color.opacity(opacity)),
                       style: StrokeStyle(lineWidth: 0.8, dash: [1, 3]))

            for (i, p) in scaled.enumerated() {
                let r: CGFloat = i == 2 ? 2.5 : 1.5
                let dot = Path(ellipseIn: CGRect(x: p.x - r, y: p.y - r, width: r*2, height: r*2))
                ctx.fill(dot, with: .color(color.opacity(opacity)))
            }
        }
        .frame(width: 120, height: 80)
    }
}

// MARK: - Moon Mark

/// Radial-gradient moon used as the app mark and on the onboarding splash.
struct MoonMark: View {
    var size: CGFloat = 44
    var color: Color = DesignTokens.Colors.primary

    var body: some View {
        ZStack {
            Circle()
                .fill(
                    RadialGradient(
                        colors: [.white, color],
                        center: .init(x: 0.35, y: 0.35),
                        startRadius: 0,
                        endRadius: size * 0.8
                    )
                )
            Circle().fill(color.opacity(0.25))
                .frame(width: size * 0.08, height: size * 0.08)
                .offset(x: -size * 0.18, y: -size * 0.09)
            Circle().fill(color.opacity(0.2))
                .frame(width: size * 0.12, height: size * 0.12)
                .offset(x: size * 0.14, y: size * 0.09)
        }
        .frame(width: size, height: size)
    }
}

// MARK: - Large "Dreaming" Moon (night player hero)

/// Detailed moon with craters used as the night player's hero.
struct DreamingMoon: View {
    var size: CGFloat = 196

    var body: some View {
        ZStack {
            Circle()
                .fill(
                    RadialGradient(
                        colors: [Color.hex(0xF9F2E4), Color.hex(0xD9CCB3), Color.hex(0x8D7B5F)],
                        center: .init(x: 0.35, y: 0.35),
                        startRadius: 0,
                        endRadius: size * 0.75
                    )
                )
                .overlay(
                    Circle()
                        .fill(
                            RadialGradient(
                                colors: [.clear, .black.opacity(0.35)],
                                center: .init(x: 0.75, y: 0.75),
                                startRadius: size * 0.2,
                                endRadius: size * 0.6
                            )
                        )
                )
                .shadow(color: Color.hex(0xF9F2E4).opacity(0.25), radius: 40)

            Circle().fill(Color.black.opacity(0.1))
                .frame(width: size * 0.09, height: size * 0.09)
                .offset(x: -size * 0.28, y: -size * 0.22)
            Circle().fill(Color.black.opacity(0.08))
                .frame(width: size * 0.13, height: size * 0.13)
                .offset(x: size * 0.16, y: size * 0.04)
            Circle().fill(Color.black.opacity(0.1))
                .frame(width: size * 0.06, height: size * 0.06)
                .offset(x: -size * 0.08, y: size * 0.22)
        }
        .frame(width: size, height: size)
        .overlay(
            Circle()
                .stroke(Color.white.opacity(0.1), lineWidth: 1)
                .frame(width: size * 1.17, height: size * 1.17)
        )
    }
}

// MARK: - Static Waveform

/// A deterministic static waveform used as the scrubber.
/// `progress` is 0...1, `bars` is the number of bars, colors adapt to theme.
struct WaveformScrubber: View {
    var progress: Double
    var bars: Int = 48
    var activeColor: Color = DesignTokens.Colors.primary
    var inactiveColor: Color = DesignTokens.Colors.ink.opacity(0.14)
    var height: CGFloat = 40

    var body: some View {
        GeometryReader { geo in
            let barWidth = max(2, (geo.size.width - CGFloat(bars - 1) * 2) / CGFloat(bars))
            let playedIndex = Int(Double(bars) * progress)
            HStack(alignment: .center, spacing: 2) {
                ForEach(0..<bars, id: \.self) { i in
                    let t = Double(i) / Double(bars)
                    let amp = 0.2 + 0.8 *
                        abs(sin(Double(i) * 0.7) * cos(Double(i) * 0.2)) *
                        (0.5 + 0.5 * sin(t * .pi))
                    Capsule()
                        .fill(i <= playedIndex ? activeColor : inactiveColor)
                        .frame(width: barWidth, height: max(4, CGFloat(amp) * height))
                }
            }
            .frame(maxHeight: .infinity, alignment: .center)
        }
        .frame(height: height)
    }
}

// MARK: - Illustration Placeholder

/// Layered pastel shapes labeled `illustration`. Meant as a drop-in for
/// real artwork later — never cutesy hand-drawn.
struct IllustrationPlaceholder: View {
    var palette: [Color]
    var label: String = "illustration"
    var seed: Int = 0

    var body: some View {
        GeometryReader { geo in
            let w = geo.size.width
            let h = geo.size.height
            ZStack(alignment: .bottomTrailing) {
                LinearGradient(
                    colors: [palette[1 % palette.count], palette[0]],
                    startPoint: .top,
                    endPoint: .bottom
                )

                ZStack {
                    Circle()
                        .fill(palette[0].opacity(0.75))
                        .frame(width: h * 0.84, height: h * 0.84)
                        .offset(x: -w * 0.2, y: 0)
                    Circle()
                        .fill(palette[1 % palette.count].opacity(0.75))
                        .frame(width: h * 0.64, height: h * 0.64)
                        .offset(x: w * 0.2, y: -h * 0.1)
                    Circle()
                        .fill(palette[2 % palette.count].opacity(0.75))
                        .frame(width: h * 0.44, height: h * 0.44)
                        .offset(x: w * 0.05, y: h * 0.2)
                }

                // speckle stars
                ForEach(0..<12, id: \.self) { i in
                    let x = CGFloat((i * 73 + seed * 31) % Int(max(1, w)))
                    let y = CGFloat((i * 47 + seed * 19) % Int(max(1, h)))
                    let r = 0.6 + CGFloat(i % 3) * 0.4
                    Circle()
                        .fill(Color.white.opacity(0.75))
                        .frame(width: r * 2, height: r * 2)
                        .position(x: x, y: y)
                }

                Text(label.uppercased())
                    .font(DesignTokens.Fonts.mono)
                    .kerning(0.4)
                    .foregroundStyle(DesignTokens.Colors.ink.opacity(0.45))
                    .padding(.trailing, 10)
                    .padding(.bottom, 8)
            }
        }
    }
}

// MARK: - Hero Cover Scene

/// Cover scene used on the ambient player — rolling hills + moon + stars.
struct CoverScene: View {
    var body: some View {
        ZStack(alignment: .topLeading) {
            LinearGradient(
                colors: [
                    DesignTokens.Colors.cardCosmos,
                    DesignTokens.Colors.cardLavender,
                    DesignTokens.Colors.cardOcean
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )

            MoonMark(size: 64, color: .white)
                .position(x: 280, y: 70)

            ForEach(0..<8, id: \.self) { i in
                let positions: [(CGFloat, CGFloat, CGFloat)] = [
                    (30, 60, 5), (60, 40, 4), (90, 120, 6),
                    (180, 50, 4), (220, 100, 5), (250, 160, 4),
                    (40, 180, 5), (140, 200, 4)
                ]
                let (x, y, s) = positions[i]
                SnoozyStar(size: s * 2, color: .white, opacity: 0.8)
                    .position(x: x, y: y)
            }

            // hills
            GeometryReader { geo in
                let w = geo.size.width
                let h = geo.size.height
                Path { p in
                    p.move(to: CGPoint(x: 0, y: h * 0.66))
                    p.addQuadCurve(to: CGPoint(x: w * 0.35, y: h * 0.5),
                                   control: CGPoint(x: w * 0.18, y: h * 0.33))
                    p.addQuadCurve(to: CGPoint(x: w * 0.7, y: h * 0.46),
                                   control: CGPoint(x: w * 0.55, y: h * 0.58))
                    p.addQuadCurve(to: CGPoint(x: w, y: h * 0.58),
                                   control: CGPoint(x: w * 0.85, y: h * 0.33))
                    p.addLine(to: CGPoint(x: w, y: h))
                    p.addLine(to: CGPoint(x: 0, y: h))
                    p.closeSubpath()
                }
                .fill(DesignTokens.Colors.primary.opacity(0.35))

                Path { p in
                    p.move(to: CGPoint(x: 0, y: h * 0.79))
                    p.addQuadCurve(to: CGPoint(x: w * 0.47, y: h * 0.7),
                                   control: CGPoint(x: w * 0.24, y: h * 0.54))
                    p.addQuadCurve(to: CGPoint(x: w, y: h * 0.75),
                                   control: CGPoint(x: w * 0.76, y: h * 0.87))
                    p.addLine(to: CGPoint(x: w, y: h))
                    p.addLine(to: CGPoint(x: 0, y: h))
                    p.closeSubpath()
                }
                .fill(DesignTokens.Colors.primaryInk.opacity(0.4))
            }

            Text("COVER ILLUSTRATION")
                .font(DesignTokens.Fonts.mono)
                .kerning(0.4)
                .foregroundStyle(DesignTokens.Colors.ink.opacity(0.5))
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottomLeading)
                .padding(.leading, 20)
                .padding(.bottom, 16)
        }
    }
}
