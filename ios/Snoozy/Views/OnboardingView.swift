import SwiftUI

/// Premium 3-step onboarding: invitation → who's it for → sign in.
/// Calm pacing, one focal moment per screen, serif emotional beats.
struct OnboardingView: View {
    @Binding var childDetails: ChildDetails
    let onFinish: () -> Void

    @State private var step: Int = 0

    var body: some View {
        ZStack {
            switch step {
            case 0: OnboardingSplash(onBegin: { step = 1 }, onSignIn: { step = 2 })
                    .transition(.opacity)
            case 1: OnboardingWhoFor(
                        childDetails: $childDetails,
                        onBack: { step = 0 },
                        onContinue: { step = 2 }
                    )
                    .transition(.opacity)
            default: OnboardingSignIn(
                        childName: childDetails.name.isEmpty ? nil : childDetails.name,
                        onBack: { step = 1 },
                        onComplete: onFinish
                    )
                    .transition(.opacity)
            }
        }
        .animation(.easeInOut(duration: 0.28), value: step)
    }
}

// MARK: - Progress dots

private struct ProgressDots: View {
    let step: Int
    var total: Int = 3

    var body: some View {
        HStack(spacing: 6) {
            ForEach(0..<total, id: \.self) { i in
                Capsule()
                    .fill(i == step ? DesignTokens.Colors.ink : DesignTokens.Colors.ink.opacity(0.18))
                    .frame(width: i == step ? 18 : 6, height: 3)
                    .animation(.easeInOut(duration: 0.3), value: step)
            }
        }
    }
}

// MARK: - 01 Splash

struct OnboardingSplash: View {
    let onBegin: () -> Void
    let onSignIn: () -> Void

    var body: some View {
        ZStack {
            RadialGradient(
                colors: [
                    DesignTokens.Colors.primarySoft,
                    DesignTokens.Colors.background,
                    DesignTokens.Colors.backgroundDeep
                ],
                center: .top,
                startRadius: 10,
                endRadius: 700
            )
            .ignoresSafeArea()

            ambientStars

            VStack(spacing: 0) {
                Text("snoozy")
                    .font(.system(size: 22, weight: .medium, design: .serif))
                    .italic()
                    .kerning(-0.3)
                    .foregroundStyle(DesignTokens.Colors.ink)
                    .padding(.top, 40)

                Spacer()

                ZStack {
                    Circle()
                        .stroke(DesignTokens.Colors.primary.opacity(0.08), lineWidth: 1)
                        .frame(width: 260, height: 260)
                    Circle()
                        .stroke(DesignTokens.Colors.primary.opacity(0.18), lineWidth: 1)
                        .frame(width: 212, height: 212)

                    Circle()
                        .fill(
                            RadialGradient(
                                colors: [
                                    .white,
                                    Color.hex(0xF0EBFF),
                                    DesignTokens.Colors.primary
                                ],
                                center: .init(x: 0.35, y: 0.35),
                                startRadius: 0,
                                endRadius: 150
                            )
                        )
                        .frame(width: 168, height: 168)
                        .shadow(color: DesignTokens.Colors.primary.opacity(0.35), radius: 40, x: 0, y: 20)
                        .overlay(
                            Circle()
                                .fill(
                                    RadialGradient(
                                        colors: [.clear, .black.opacity(0.18)],
                                        center: .init(x: 0.75, y: 0.75),
                                        startRadius: 40, endRadius: 100
                                    )
                                )
                                .frame(width: 168, height: 168)
                        )
                }

                VStack(spacing: 0) {
                    Text("A quiet place")
                        .font(.system(size: 34, weight: .regular, design: .serif))
                        .kerning(-0.7)
                        .foregroundStyle(DesignTokens.Colors.ink)
                    (
                        Text("for ")
                            .foregroundStyle(DesignTokens.Colors.ink)
                        +
                        Text("bedtime stories.")
                            .italic()
                            .foregroundStyle(DesignTokens.Colors.primary)
                    )
                    .font(.system(size: 34, weight: .regular, design: .serif))
                    .kerning(-0.7)
                }
                .multilineTextAlignment(.center)
                .padding(.top, 50)

                Text("Made just for your little one — \nin about three minutes.")
                    .font(.system(size: 14, design: .rounded))
                    .foregroundStyle(DesignTokens.Colors.inkSoft)
                    .multilineTextAlignment(.center)
                    .padding(.top, 14)

                Spacer()

                VStack(spacing: 22) {
                    SnoozyButton(title: "Begin", style: .primary, action: onBegin)
                    ProgressDots(step: 0)
                    Button(action: onSignIn) {
                        (
                            Text("I already have an account · ")
                                .foregroundStyle(DesignTokens.Colors.inkMute)
                            +
                            Text("Sign in")
                                .foregroundStyle(DesignTokens.Colors.primary)
                                .fontWeight(.bold)
                        )
                        .font(.system(size: 12, design: .rounded))
                    }
                    .buttonStyle(.plain)
                }
                .padding(.horizontal, DesignTokens.Spacing.xl)
                .padding(.bottom, 40)
            }
        }
    }

    private var ambientStars: some View {
        let positions: [(CGFloat, CGFloat, CGFloat, Double)] = [
            (48, 120, 4, 0.5),
            (90, 200, 3, 0.35),
            (310, 150, 4, 0.5),
            (280, 240, 3, 0.4),
            (60, 300, 3, 0.35),
            (330, 80, 3, 0.4),
            (180, 90, 4, 0.55)
        ]
        return ZStack {
            ForEach(0..<positions.count, id: \.self) { i in
                let (x, y, s, o) = positions[i]
                SnoozyStar(size: s * 2, color: DesignTokens.Colors.primary, opacity: o)
                    .position(x: x, y: y)
            }
        }
    }
}

// MARK: - 02 Who's it for

struct OnboardingWhoFor: View {
    @Binding var childDetails: ChildDetails
    let onBack: () -> Void
    let onContinue: () -> Void

    @FocusState private var nameFocused: Bool

    private let ages = Array(3...8)

    var body: some View {
        ZStack {
            DesignTokens.Colors.background.ignoresSafeArea()
            ScrollView(showsIndicators: false) {
                VStack(alignment: .leading, spacing: 0) {
                    topBar
                        .padding(.top, 24)

                    VStack(alignment: .leading, spacing: 10) {
                        Text("FIRST, TELL US —")
                            .font(DesignTokens.Fonts.eyebrow)
                            .kerning(2)
                            .foregroundStyle(DesignTokens.Colors.inkMute)
                        VStack(alignment: .leading, spacing: 0) {
                            Text("Who are we")
                                .font(.system(size: 36, weight: .regular, design: .serif))
                                .kerning(-0.8)
                                .foregroundStyle(DesignTokens.Colors.ink)
                            Text("tucking in tonight?")
                                .font(.system(size: 36, weight: .regular, design: .serif))
                                .italic()
                                .kerning(-0.8)
                                .foregroundStyle(DesignTokens.Colors.primary)
                        }
                    }
                    .padding(.horizontal, DesignTokens.Spacing.xl)
                    .padding(.top, 72)

                    VStack(alignment: .leading, spacing: 20) {
                        nameCard
                        ageSection
                        reassurance
                    }
                    .padding(.horizontal, DesignTokens.Spacing.xl)
                    .padding(.top, 48)

                    Spacer(minLength: 60)

                    VStack(spacing: 22) {
                        SnoozyButton(title: "Continue") {
                            if isValid { onContinue() }
                        }
                        .opacity(isValid ? 1 : 0.55)
                        .disabled(!isValid)
                        ProgressDots(step: 1)
                    }
                    .padding(.horizontal, DesignTokens.Spacing.xl)
                    .padding(.bottom, 40)
                }
            }
            .scrollClipDisabled()
        }
    }

    private var isValid: Bool {
        !childDetails.name.trimmingCharacters(in: .whitespaces).isEmpty
    }

    // MARK: Sub-views

    private var topBar: some View {
        HStack {
            Button(action: onBack) {
                ZStack {
                    Circle()
                        .fill(DesignTokens.Colors.surface)
                        .overlay(Circle().stroke(DesignTokens.Colors.hair, lineWidth: 1))
                    Image(systemName: "chevron.left")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(DesignTokens.Colors.ink)
                }
                .frame(width: 36, height: 36)
            }
            .buttonStyle(.plain)
            Spacer()
            Text("2 OF 3")
                .font(DesignTokens.Fonts.eyebrow)
                .kerning(2)
                .foregroundStyle(DesignTokens.Colors.inkMute)
            Spacer()
            Color.clear.frame(width: 36, height: 36)
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    private var nameCard: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("THEIR NAME")
                .font(.system(size: 11, weight: .bold, design: .rounded))
                .kerning(1)
                .foregroundStyle(DesignTokens.Colors.inkMute)

            TextField("e.g. Ava", text: $childDetails.name)
                .font(.system(size: 28, weight: .medium, design: .serif))
                .italic()
                .foregroundStyle(DesignTokens.Colors.ink)
                .kerning(-0.4)
                .focused($nameFocused)
                .textFieldStyle(.plain)
        }
        .padding(.horizontal, 22)
        .padding(.vertical, 18)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(DesignTokens.Colors.surface)
        .overlay(
            RoundedRectangle(cornerRadius: 20, style: .continuous)
                .stroke(DesignTokens.Colors.hair, lineWidth: 1)
        )
        .clipShape(.rect(cornerRadius: 20))
        .shadow(color: DesignTokens.Colors.ink.opacity(0.06), radius: 12, x: 0, y: 10)
    }

    private var ageSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("HOW OLD?")
                .font(.system(size: 11, weight: .bold, design: .rounded))
                .kerning(1)
                .foregroundStyle(DesignTokens.Colors.inkMute)
                .padding(.leading, 4)
            HStack(spacing: 8) {
                ForEach(ages, id: \.self) { a in
                    Button { childDetails.age = a } label: {
                        let selected = childDetails.age == a
                        Text("\(a)")
                            .font(.system(size: 18, weight: .medium, design: .serif))
                            .foregroundStyle(selected ? DesignTokens.Colors.background : DesignTokens.Colors.ink)
                            .frame(maxWidth: .infinity)
                            .frame(height: 48)
                            .background(selected ? DesignTokens.Colors.ink : DesignTokens.Colors.surface)
                            .clipShape(.rect(cornerRadius: 14))
                            .overlay(
                                RoundedRectangle(cornerRadius: 14, style: .continuous)
                                    .stroke(selected ? Color.clear : DesignTokens.Colors.hair, lineWidth: 1)
                            )
                            .shadow(color: selected ? DesignTokens.Colors.ink.opacity(0.22) : .clear, radius: 8, x: 0, y: 8)
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }

    private var reassurance: some View {
        HStack(alignment: .top, spacing: 10) {
            Text("\u{263E}")
                .font(.system(size: 14))
                .foregroundStyle(DesignTokens.Colors.primaryInk)
            VStack(alignment: .leading, spacing: 2) {
                Text("We'll keep this private.")
                    .font(.system(size: 12, weight: .bold, design: .rounded))
                Text("Names help us make the story personal — they never leave your phone.")
                    .font(.system(size: 12, design: .rounded))
                    .opacity(0.85)
            }
            .foregroundStyle(DesignTokens.Colors.primaryInk)
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(DesignTokens.Colors.primarySoft)
        .clipShape(.rect(cornerRadius: 14))
    }
}

// MARK: - 03 Sign in

struct OnboardingSignIn: View {
    let childName: String?
    let onBack: () -> Void
    let onComplete: () -> Void

    var body: some View {
        ZStack {
            RadialGradient(
                colors: [
                    DesignTokens.Colors.primarySoft,
                    DesignTokens.Colors.background,
                    DesignTokens.Colors.backgroundDeep
                ],
                center: .top,
                startRadius: 10,
                endRadius: 700
            )
            .ignoresSafeArea()

            VStack(spacing: 0) {
                topBar
                    .padding(.top, 24)

                heroMark
                    .padding(.top, 54)

                headline
                    .padding(.top, 28)

                VStack(spacing: 10) {
                    socialButton(
                        background: DesignTokens.Colors.ink,
                        foreground: .white,
                        leading: AnyView(appleLogo),
                        label: "Continue with Apple",
                        action: onComplete
                    )
                    socialButton(
                        background: DesignTokens.Colors.surface,
                        foreground: DesignTokens.Colors.ink,
                        leading: AnyView(googleLogo),
                        label: "Continue with Google",
                        action: onComplete
                    )
                    orDivider
                    emailButton
                }
                .padding(.horizontal, DesignTokens.Spacing.lg)
                .padding(.top, 48)

                Spacer()

                legalFooter
                    .font(.system(size: 11, design: .rounded))
                    .multilineTextAlignment(.center)
                    .lineSpacing(3)
                    .padding(.horizontal, 40)

                ProgressDots(step: 2)
                    .padding(.top, 18)
                    .padding(.bottom, 40)
            }
        }
    }

    private var legalFooter: Text {
        Text("By continuing you agree to our\n")
            .foregroundColor(DesignTokens.Colors.inkMute)
        + Text("Terms")
            .foregroundColor(DesignTokens.Colors.ink)
            .fontWeight(.bold)
        + Text(" and ")
            .foregroundColor(DesignTokens.Colors.inkMute)
        + Text("Privacy Policy")
            .foregroundColor(DesignTokens.Colors.ink)
            .fontWeight(.bold)
    }

    // MARK: Sub-views

    private var topBar: some View {
        HStack {
            Button(action: onBack) {
                ZStack {
                    Circle()
                        .fill(DesignTokens.Colors.surface)
                        .overlay(Circle().stroke(DesignTokens.Colors.hair, lineWidth: 1))
                    Image(systemName: "chevron.left")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(DesignTokens.Colors.ink)
                }
                .frame(width: 36, height: 36)
            }
            .buttonStyle(.plain)
            Spacer()
            Text("3 OF 3")
                .font(DesignTokens.Fonts.eyebrow)
                .kerning(2)
                .foregroundStyle(DesignTokens.Colors.inkMute)
            Spacer()
            Color.clear.frame(width: 36, height: 36)
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
    }

    private var heroMark: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 22, style: .continuous)
                .fill(
                    LinearGradient(
                        colors: [
                            DesignTokens.Colors.primary,
                            Color.hex(0x8789E8),
                            DesignTokens.Colors.accent
                        ],
                        startPoint: .topLeading, endPoint: .bottomTrailing
                    )
                )
                .shadow(color: DesignTokens.Colors.primary.opacity(0.3), radius: 20, x: 0, y: 16)
            MoonMark(size: 40, color: .white)
        }
        .frame(width: 64, height: 64)
    }

    private var headline: some View {
        VStack(spacing: 12) {
            VStack(spacing: 0) {
                Text(saveLine1)
                    .font(.system(size: 30, weight: .regular, design: .serif))
                    .kerning(-0.6)
                    .foregroundStyle(DesignTokens.Colors.ink)
                Text("for another night.")
                    .font(.system(size: 30, weight: .regular, design: .serif))
                    .italic()
                    .kerning(-0.6)
                    .foregroundStyle(DesignTokens.Colors.primary)
            }
            Text("Sign in so your library follows you across devices.")
                .font(.system(size: 13, design: .rounded))
                .foregroundStyle(DesignTokens.Colors.inkSoft)
                .frame(maxWidth: 280)
                .multilineTextAlignment(.center)
        }
    }

    private var saveLine1: String {
        if let name = childName {
            return "Save \(name)'s stories"
        }
        return "Save their stories"
    }

    private func socialButton(
        background: Color,
        foreground: Color,
        leading: AnyView,
        label: String,
        action: @escaping () -> Void
    ) -> some View {
        Button(action: action) {
            HStack(spacing: 10) {
                leading
                Text(label)
                    .font(.system(size: 15, weight: .bold, design: .rounded))
                    .foregroundStyle(foreground)
            }
            .frame(maxWidth: .infinity)
            .frame(height: 54)
            .background(background)
            .overlay(
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .stroke(background == DesignTokens.Colors.surface ? DesignTokens.Colors.hair : .clear, lineWidth: 1)
            )
            .clipShape(.rect(cornerRadius: 16))
            .shadow(color: DesignTokens.Colors.ink.opacity(background == DesignTokens.Colors.ink ? 0.22 : 0), radius: 18, x: 0, y: 10)
        }
        .buttonStyle(.plain)
    }

    private var appleLogo: some View {
        Image(systemName: "applelogo")
            .font(.system(size: 18))
            .foregroundStyle(.white)
    }

    private var googleLogo: some View {
        // Simple 4-color disc stand-in for Google's multi-color mark.
        ZStack {
            Circle().stroke(Color.hex(0x4285F4), lineWidth: 4).frame(width: 18, height: 18)
                .rotationEffect(.degrees(-20))
            Circle()
                .trim(from: 0.0, to: 0.25)
                .stroke(Color.hex(0xEA4335), lineWidth: 4)
                .frame(width: 18, height: 18)
            Circle()
                .trim(from: 0.25, to: 0.5)
                .stroke(Color.hex(0xFBBC05), lineWidth: 4)
                .frame(width: 18, height: 18)
            Circle()
                .trim(from: 0.5, to: 0.75)
                .stroke(Color.hex(0x34A853), lineWidth: 4)
                .frame(width: 18, height: 18)
        }
        .frame(width: 18, height: 18)
    }

    private var orDivider: some View {
        HStack(spacing: 12) {
            Rectangle().fill(DesignTokens.Colors.hair).frame(height: 1)
            Text("OR")
                .font(.system(size: 11, weight: .bold, design: .rounded))
                .kerning(1.5)
                .foregroundStyle(DesignTokens.Colors.inkMute)
            Rectangle().fill(DesignTokens.Colors.hair).frame(height: 1)
        }
        .padding(.vertical, 10)
    }

    private var emailButton: some View {
        Button(action: onComplete) {
            Text("Use email instead")
                .font(.system(size: 14, weight: .bold, design: .rounded))
                .foregroundStyle(DesignTokens.Colors.ink)
                .frame(maxWidth: .infinity)
                .frame(height: 54)
                .overlay(
                    RoundedRectangle(cornerRadius: 16, style: .continuous)
                        .stroke(
                            DesignTokens.Colors.ink.opacity(0.2),
                            style: StrokeStyle(lineWidth: 1, dash: [4, 4])
                        )
                )
        }
        .buttonStyle(.plain)
    }
}
