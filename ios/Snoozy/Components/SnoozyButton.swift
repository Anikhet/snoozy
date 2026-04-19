import SwiftUI

/// Snoozy's primary action button. Premium redesign:
/// ink-colored pill, bold rounded label, soft lifted shadow.
/// Pass `style: .primary` (ink) or `.indigo` (gradient) for the generate CTA.
struct SnoozyButton: View {
    enum Style { case primary, indigo, subtle }

    let title: String
    let icon: String?
    var style: Style = .primary
    let action: () -> Void

    init(title: String, icon: String? = nil, style: Style = .primary, action: @escaping () -> Void) {
        self.title = title
        self.icon = icon
        self.style = style
        self.action = action
    }

    var body: some View {
        Button(action: action) {
            HStack(spacing: DesignTokens.Spacing.sm) {
                if let icon {
                    Image(systemName: icon)
                        .font(.body.weight(.semibold))
                }
                Text(title)
                    .font(DesignTokens.Fonts.buttonLabel)
            }
            .foregroundStyle(foreground)
            .frame(maxWidth: .infinity)
            .frame(height: DesignTokens.Sizing.buttonHeight)
            .background(background)
            .clipShape(.rect(cornerRadius: DesignTokens.Radii.button))
            .snoozyLiftShadow()
        }
        .buttonStyle(.plain)
    }

    @ViewBuilder
    private var background: some View {
        switch style {
        case .primary:
            DesignTokens.Colors.ink
        case .indigo:
            LinearGradient(
                colors: [DesignTokens.Colors.primary, Color.hex(0x7272D8)],
                startPoint: .topLeading, endPoint: .bottomTrailing
            )
        case .subtle:
            DesignTokens.Colors.surface
        }
    }

    private var foreground: Color {
        switch style {
        case .primary, .indigo: return DesignTokens.Colors.background
        case .subtle: return DesignTokens.Colors.ink
        }
    }
}
