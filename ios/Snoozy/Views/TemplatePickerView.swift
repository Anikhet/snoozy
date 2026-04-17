import SwiftUI

/// Pick a theme — 2-column gradient grid with editorial copy.
struct TemplatePickerView: View {
    let onSelect: (Template) -> Void
    let onBack: () -> Void

    private let columns = [
        GridItem(.flexible(), spacing: 12),
        GridItem(.flexible(), spacing: 12)
    ]

    var body: some View {
        ScrollView(showsIndicators: false) {
            VStack(alignment: .leading, spacing: 0) {
                header
                title
                    .padding(.horizontal, DesignTokens.Spacing.lg)
                    .padding(.top, 22)
                LazyVGrid(columns: columns, spacing: 12) {
                    ForEach(Templates.all) { t in
                        TemplateCard(template: t) { onSelect(t) }
                    }
                }
                .padding(.horizontal, DesignTokens.Spacing.lg)
                .padding(.top, 22)

                Text("Tap one to begin")
                    .font(.system(size: 12, weight: .regular, design: .serif))
                    .italic()
                    .foregroundStyle(DesignTokens.Colors.inkMute)
                    .frame(maxWidth: .infinity)
                    .padding(.top, 16)

                Spacer(minLength: DesignTokens.Spacing.xxl)
            }
        }
        .scrollClipDisabled()
        .background(DesignTokens.Colors.background)
    }

    private var header: some View {
        HStack(spacing: 14) {
            Button(action: onBack) {
                ZStack {
                    Circle()
                        .fill(DesignTokens.Colors.surface)
                        .overlay(
                            Circle().stroke(DesignTokens.Colors.hair, lineWidth: 1)
                        )
                    Image(systemName: "chevron.left")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(DesignTokens.Colors.ink)
                }
                .frame(width: 38, height: 38)
            }
            .buttonStyle(.plain)
            Text("STEP 1 OF 3")
                .font(DesignTokens.Fonts.eyebrow)
                .kerning(2)
                .foregroundStyle(DesignTokens.Colors.inkMute)
            Spacer()
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
        .padding(.top, 8)
    }

    private var title: some View {
        VStack(alignment: .leading, spacing: 10) {
            VStack(alignment: .leading, spacing: 0) {
                Text("Pick a place")
                    .font(.system(size: 34, weight: .regular, design: .serif))
                    .kerning(-0.6)
                    .foregroundStyle(DesignTokens.Colors.ink)
                Text("to wander into.")
                    .font(.system(size: 34, weight: .regular, design: .serif))
                    .italic()
                    .kerning(-0.6)
                    .foregroundStyle(DesignTokens.Colors.primary)
            }
            Text("Each one is a different texture of calm. Choose what fits tonight.")
                .font(.system(size: 13, design: .rounded))
                .foregroundStyle(DesignTokens.Colors.inkSoft)
                .frame(maxWidth: 280, alignment: .leading)
        }
    }
}
