import SwiftUI

/// Displays the 3 story template cards for selection.
struct TemplatePickerView: View {
    let onSelect: (Template) -> Void
    let onBack: () -> Void

    var body: some View {
        VStack(spacing: DesignTokens.Spacing.lg) {
            header

            Text("Pick a story theme")
                .font(DesignTokens.Fonts.title)
                .foregroundStyle(DesignTokens.Colors.textPrimary)

            ScrollView(showsIndicators: false) {
                VStack(spacing: DesignTokens.Spacing.md) {
                    ForEach(Templates.all) { template in
                        TemplateCard(template: template) {
                            onSelect(template)
                        }
                    }
                }
                .padding(.bottom, DesignTokens.Spacing.xl)
            }
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
        .padding(.top, DesignTokens.Spacing.lg)
    }

    private var header: some View {
        HStack {
            Button(action: onBack) {
                Image(systemName: "chevron.left")
                    .font(.title3.weight(.medium))
                    .foregroundStyle(DesignTokens.Colors.primary)
            }
            Spacer()
        }
    }
}
