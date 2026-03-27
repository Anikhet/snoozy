import SwiftUI

/// Snoozy's primary action button with icon + label, rounded shape, and soft shadow.
struct SnoozyButton: View {
    let title: String
    let icon: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: DesignTokens.Spacing.sm) {
                Image(systemName: icon)
                    .font(.body.weight(.semibold))
                Text(title)
                    .font(DesignTokens.Fonts.buttonLabel)
            }
            .foregroundStyle(.white)
            .frame(maxWidth: .infinity)
            .frame(height: DesignTokens.Sizing.buttonHeight)
            .background(DesignTokens.Colors.primary)
            .clipShape(.rect(cornerRadius: DesignTokens.Radii.button))
            .snoozyCardShadow()
        }
    }
}
