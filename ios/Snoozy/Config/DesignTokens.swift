import SwiftUI

/// Centralized design tokens for Snoozy's visual identity.
/// All colors support light and dark mode with warm, soothing tones.
enum DesignTokens {

    // MARK: - Colors

    enum Colors {
        static let background = Color(light: .hex(0xFFF8F0), dark: .hex(0x1A1A2E))
        static let surface = Color(light: .hex(0xFFFFFF), dark: .hex(0x252540))
        static let primary = Color(light: .hex(0x7C83FD), dark: .hex(0x9BA0FF))
        static let secondary = Color(light: .hex(0xFFCBA4), dark: .hex(0xFFD4A8))
        static let tertiary = Color(light: .hex(0xA8E6CF), dark: .hex(0xB8F0D5))
        static let textPrimary = Color(light: .hex(0x3D2C2E), dark: .hex(0xF0EBE3))
        static let textSecondary = Color(light: .hex(0x7A6B6E), dark: .hex(0xA09898))

        static let cardLavender = Color(light: .hex(0xE8E5FF), dark: .hex(0x2E2B4A))
        static let cardPeach = Color(light: .hex(0xFFE8D6), dark: .hex(0x3A2E28))
        static let cardMint = Color(light: .hex(0xD4F0E7), dark: .hex(0x1E3A30))

        static let error = Color(light: .hex(0xFF6B6B), dark: .hex(0xFF8A8A))
    }

    // MARK: - Typography

    enum Fonts {
        static let largeTitle = Font.system(.largeTitle, design: .rounded, weight: .bold)
        static let title = Font.system(.title2, design: .rounded, weight: .semibold)
        static let headline = Font.system(.headline, design: .rounded, weight: .medium)
        static let body = Font.system(.body, design: .rounded)
        static let caption = Font.system(.caption, design: .rounded)
        static let buttonLabel = Font.system(.title3, design: .rounded, weight: .semibold)
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
        static let card: CGFloat = 20
        static let button: CGFloat = 16
        static let small: CGFloat = 12
    }

    // MARK: - Sizing

    enum Sizing {
        static let buttonHeight: CGFloat = 56
        static let cardMinHeight: CGFloat = 140
    }
}

// MARK: - Color Helpers

extension Color {
    /// Creates an adaptive color that switches between light and dark variants.
    init(light: Color, dark: Color) {
        self.init(uiColor: UIColor { traits in
            traits.userInterfaceStyle == .dark
                ? UIColor(dark)
                : UIColor(light)
        })
    }

    /// Creates a color from a hex integer (e.g., 0xFFF8F0).
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
    /// Applies Snoozy's adaptive soft shadow: dark shadow in light mode, subtle glow in dark mode.
    func snoozyCardShadow() -> some View {
        self.shadow(
            color: Color(light: .black.opacity(0.06), dark: .white.opacity(0.04)),
            radius: 8,
            x: 0,
            y: 4
        )
    }
}
