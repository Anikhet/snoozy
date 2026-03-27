import SwiftUI

/// A large, tappable card representing a story template in the picker.
struct TemplateCard: View {
    let template: Template
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            HStack(spacing: DesignTokens.Spacing.md) {
                Image(systemName: template.icon)
                    .font(.system(size: 32))
                    .foregroundStyle(DesignTokens.Colors.primary)
                    .frame(width: 56, height: 56)

                VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
                    Text(template.name)
                        .font(DesignTokens.Fonts.headline)
                        .foregroundStyle(DesignTokens.Colors.textPrimary)

                    Text(template.description)
                        .font(DesignTokens.Fonts.caption)
                        .foregroundStyle(DesignTokens.Colors.textSecondary)
                }

                Spacer()

                Image(systemName: "chevron.right")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(DesignTokens.Colors.textSecondary.opacity(0.5))
            }
            .padding(DesignTokens.Spacing.lg)
            .frame(minHeight: DesignTokens.Sizing.cardMinHeight)
            .background(template.cardColor)
            .clipShape(.rect(cornerRadius: DesignTokens.Radii.card))
            .snoozyCardShadow()
        }
        .buttonStyle(.plain)
    }
}
