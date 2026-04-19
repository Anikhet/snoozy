import SwiftUI

/// Snoozy premium design tokens — editorial, warm, storybook-leaning.
/// Serif (New York) for emotional beats; rounded sans (SF Rounded) for UI;
/// monospaced for timers and metadata. Palette keeps the lavender/cream
/// lineage but upgrades saturation and adds a night-mode surface.
enum DesignTokens {

    // MARK: - Colors

    enum Colors {
        // Base surfaces
        static let background = Color(light: .hex(0xFBF5EC), dark: .hex(0x0F1530))
        static let backgroundDeep = Color(light: .hex(0xF4EBD9), dark: .hex(0x070B1E))
        static let surface = Color(light: .hex(0xFFFFFF), dark: .hex(0x1A2144))

        // Ink (text)
        static let ink = Color(light: .hex(0x2B2130), dark: .hex(0xF2EDE3))
        static let inkSoft = Color(light: .hex(0x6E5F69), dark: Color.hex(0xF2EDE3).opacity(0.62))
        static let inkMute = Color(light: .hex(0x9A8A92), dark: Color.hex(0xF2EDE3).opacity(0.4))
        static let hair = Color(light: Color.hex(0x2B2130).opacity(0.08), dark: Color.hex(0xF2EDE3).opacity(0.14))

        // Brand
        static let primary = Color(light: .hex(0x5B5BD6), dark: .hex(0x9BA0FF))
        static let primarySoft = Color(light: .hex(0xE6E5FF), dark: .hex(0x2A2F5E))
        static let primaryInk = Color(light: .hex(0x3A3AA8), dark: .hex(0xCBCDFF))
        static let accent = Color(light: .hex(0xE9A97A), dark: .hex(0xE9A97A))
        static let gold = Color(light: .hex(0xC9A56B), dark: .hex(0xD8B87A))

        // Night-mode dedicated tones (for the player's "dreaming" state)
        static let night = Color.hex(0x0F1530)
        static let nightDeep = Color.hex(0x070B1E)
        static let nightSurface = Color.hex(0x1A2144)
        static let nightInk = Color.hex(0xF2EDE3)
        static let nightInkSoft = Color.hex(0xF2EDE3).opacity(0.62)
        static let nightHair = Color.hex(0xF2EDE3).opacity(0.14)

        // Card gradients — pastels with ~10% less saturation than v1
        static let cardLavender = Color(light: .hex(0xE8E5FF), dark: .hex(0x2E2B4A))
        static let cardLavenderDeep = Color(light: .hex(0xB8ABE8), dark: .hex(0x3F3A5C))
        static let cardPeach = Color(light: .hex(0xFBE1CC), dark: .hex(0x3A2E28))
        static let cardPeachDeep = Color(light: .hex(0xF4C7A0), dark: .hex(0x4E3D32))
        static let cardMint = Color(light: .hex(0xD7ECDD), dark: .hex(0x1E3A30))
        static let cardMintDeep = Color(light: .hex(0xB6D6BF), dark: .hex(0x2C4A3E))
        static let cardOcean = Color(light: .hex(0xD4E4F0), dark: .hex(0x1E2E3A))
        static let cardOceanDeep = Color(light: .hex(0xB9D0E5), dark: .hex(0x2E3E4A))
        static let cardCosmos = Color(light: .hex(0xDCD5F1), dark: .hex(0x2A254A))
        static let cardCosmosDeep = Color(light: .hex(0xB8ABE8), dark: .hex(0x3B3458))
        static let cardRose = Color(light: .hex(0xF6DCE1), dark: .hex(0x3A1E2E))
        static let cardRoseDeep = Color(light: .hex(0xE9B5C1), dark: .hex(0x4C2E3C))
        static let cardSnow = Color(light: .hex(0xE4ECEE), dark: .hex(0x1E2E34))
        static let cardSnowDeep = Color(light: .hex(0xB8C8CC), dark: .hex(0x30404A))
        static let cardRain = Color(light: .hex(0xD4DEE8), dark: .hex(0x202838))
        static let cardRainDeep = Color(light: .hex(0xA8BBCE), dark: .hex(0x30394A))

        // Legacy aliases kept for older call sites
        static let textPrimary = ink
        static let textSecondary = inkSoft
        static let secondary = accent
        static let tertiary = cardMint
        static let error = Color(light: .hex(0xD96C6C), dark: .hex(0xFF8A8A))
    }

    // MARK: - Typography
    //
    // Fraunces → `.serif` design (New York). Nunito → `.rounded` design.
    // JetBrains Mono → `.monospaced` design.

    enum Fonts {
        // Serif — editorial beats (greetings, story titles, hero copy)
        static let serifDisplay = Font.system(size: 38, weight: .regular, design: .serif)
        static let serifTitle = Font.system(size: 30, weight: .regular, design: .serif)
        static let serifHeadline = Font.system(size: 22, weight: .medium, design: .serif)
        static let serifBody = Font.system(size: 17, weight: .regular, design: .serif)

        // Sans (rounded) — UI & body
        static let body = Font.system(size: 15, weight: .regular, design: .rounded)
        static let bodyBold = Font.system(size: 15, weight: .bold, design: .rounded)
        static let caption = Font.system(size: 12, weight: .semibold, design: .rounded)
        static let buttonLabel = Font.system(size: 16, weight: .bold, design: .rounded)

        // Tiny uppercase eyebrows (11pt, wide tracking)
        static let eyebrow = Font.system(size: 11, weight: .bold, design: .rounded)

        // Mono — timers, metadata
        static let mono = Font.system(size: 11, weight: .medium, design: .monospaced)

        // Legacy aliases
        static let largeTitle = serifDisplay
        static let title = serifHeadline
        static let headline = Font.system(size: 16, weight: .semibold, design: .rounded)
    }

    // MARK: - Spacing

    enum Spacing {
        static let xs: CGFloat = 4
        static let sm: CGFloat = 8
        static let md: CGFloat = 16
        static let lg: CGFloat = 24
        static let xl: CGFloat = 32
        static let xxl: CGFloat = 48
    }

    // MARK: - Radii

    enum Radii {
        static let field: CGFloat = 14
        static let small: CGFloat = 12
        static let button: CGFloat = 18
        static let card: CGFloat = 20
        static let cardLarge: CGFloat = 28
    }

    // MARK: - Sizing

    enum Sizing {
        static let buttonHeight: CGFloat = 56
        static let cardMinHeight: CGFloat = 140
    }
}

// MARK: - Color Helpers

extension Color {
    init(light: Color, dark: Color) {
        self.init(uiColor: UIColor { traits in
            traits.userInterfaceStyle == .dark
                ? UIColor(dark)
                : UIColor(light)
        })
    }

    static func hex(_ hex: UInt) -> Color {
        Color(
            red: Double((hex >> 16) & 0xFF) / 255.0,
            green: Double((hex >> 8) & 0xFF) / 255.0,
            blue: Double(hex & 0xFF) / 255.0
        )
    }
}

// MARK: - Shadow Helpers

extension View {
    /// Soft lifted-card shadow — deeper in light mode, gentler glow in dark.
    func snoozyCardShadow() -> some View {
        self.shadow(
            color: Color(light: .black.opacity(0.06), dark: .white.opacity(0.04)),
            radius: 12,
            x: 0,
            y: 6
        )
    }

    /// Heavier shadow for primary CTAs and floating elements.
    func snoozyLiftShadow() -> some View {
        self.shadow(
            color: Color(light: Color.hex(0x2B2130).opacity(0.22), dark: .black.opacity(0.4)),
            radius: 18,
            x: 0,
            y: 10
        )
    }
}
