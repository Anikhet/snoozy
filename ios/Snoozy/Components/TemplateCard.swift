import SwiftUI

/// A gradient tile in the template picker. Shows a large serif glyph
/// in a frosted-glass badge, speckle decoration, and editorial copy.
struct TemplateCard: View {
    let template: Template
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            ZStack(alignment: .topLeading) {
                LinearGradient(
                    colors: template.gradient,
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )

                // Decorative speckle stars
                GeometryReader { geo in
                    let w = geo.size.width
                    let offset = CGFloat(template.id.count % 12)
                    ForEach(0..<8, id: \.self) { i in
                        let x = 10 + CGFloat(i) * 18 + offset
                        let y = 40 + CGFloat((i * 13) % 40)
                        let r = 1 + CGFloat(i % 3) * 0.3
                        Circle()
                            .fill(Color.white.opacity(0.55))
                            .frame(width: r * 2, height: r * 2)
                            .position(x: min(x, w - 8), y: y)
                    }
                }

                VStack(alignment: .leading, spacing: 0) {
                    // Glyph badge
                    Text(template.glyph)
                        .font(.system(size: 20, weight: .regular, design: .serif))
                        .foregroundStyle(DesignTokens.Colors.ink)
                        .frame(width: 36, height: 36)
                        .background(
                            RoundedRectangle(cornerRadius: 12, style: .continuous)
                                .fill(Color.white.opacity(0.55))
                        )
                        .overlay(
                            RoundedRectangle(cornerRadius: 12, style: .continuous)
                                .stroke(Color.white.opacity(0.8), lineWidth: 1)
                        )

                    Spacer(minLength: 0)

                    Text(template.name)
                        .font(.system(size: 17, weight: .medium, design: .serif))
                        .kerning(-0.2)
                        .foregroundStyle(DesignTokens.Colors.ink)
                        .lineLimit(1)
                    Text(template.description)
                        .font(.system(size: 11, weight: .regular, design: .rounded))
                        .foregroundStyle(DesignTokens.Colors.inkSoft)
                        .lineLimit(2)
                        .padding(.top, 3)
                }
                .padding(14)
            }
            .frame(height: 158)
            .clipShape(RoundedRectangle(cornerRadius: 22, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 22, style: .continuous)
                    .stroke(DesignTokens.Colors.ink.opacity(0.04), lineWidth: 1)
            )
            .shadow(color: DesignTokens.Colors.ink.opacity(0.06), radius: 18, x: 0, y: 8)
        }
        .buttonStyle(.plain)
    }
}
