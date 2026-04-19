import SwiftUI

/// A story template that defines the theme, form fields, and visual style.
struct Template: Identifiable {
    let id: String
    let name: String
    let description: String
    /// SF Symbol — retained for legacy/accessibility callouts.
    let icon: String
    /// Editorial serif glyph shown in the template picker tile.
    let glyph: String
    /// Two-stop gradient used for the picker tile and story-row thumb.
    let gradient: [Color]
    /// Flat fallback color for places that can't render a gradient.
    var cardColor: Color { gradient.first ?? DesignTokens.Colors.cardLavender }
    let fields: [TemplateField]
}

/// A form field required by a specific template.
struct TemplateField: Identifiable {
    let id: String
    let label: String
    let type: FieldType

    enum FieldType {
        case color
        case animal
        case text
    }
}

/// All available story templates.
enum Templates {
    static let all: [Template] = [
        Template(
            id: "dreamland",
            name: "Dreamland",
            description: "A journey through soft, drifting dreams.",
            icon: "moon.stars.fill",
            glyph: "\u{263E}", // ☾
            gradient: [DesignTokens.Colors.cardLavender, DesignTokens.Colors.cardCosmosDeep],
            fields: [
                TemplateField(id: "favoriteColor", label: "Favourite colour", type: .color)
            ]
        ),
        Template(
            id: "animal-friends",
            name: "Animal Friends",
            description: "Whispering forests and warm fur.",
            icon: "hare.fill",
            glyph: "\u{2740}", // ❀
            gradient: [DesignTokens.Colors.cardPeach, DesignTokens.Colors.cardPeachDeep],
            fields: [
                TemplateField(id: "favoriteAnimal", label: "Favourite animal", type: .animal)
            ]
        ),
        Template(
            id: "under-the-stars",
            name: "Under the Stars",
            description: "A peaceful night in the cosmos.",
            icon: "sparkles",
            glyph: "\u{2726}", // ✦
            gradient: [DesignTokens.Colors.cardCosmos, DesignTokens.Colors.cardCosmosDeep],
            fields: [
                TemplateField(id: "favoriteThing", label: "Favourite thing", type: .text)
            ]
        ),
        Template(
            id: "underwater-journey",
            name: "Underwater",
            description: "Drifting through a gentle sea.",
            icon: "water.waves",
            glyph: "\u{223C}", // ∼
            gradient: [DesignTokens.Colors.cardOcean, DesignTokens.Colors.cardOceanDeep],
            fields: [
                TemplateField(id: "favoriteColor", label: "Favourite colour", type: .color)
            ]
        ),
        Template(
            id: "space-explorer",
            name: "Space Explorer",
            description: "A slow trip through the cosmos.",
            icon: "moonphase.waning.crescent",
            glyph: "\u{272A}", // ✪
            gradient: [DesignTokens.Colors.cardCosmos, DesignTokens.Colors.cardLavenderDeep],
            fields: [
                TemplateField(id: "favoriteThing", label: "Favourite thing", type: .text)
            ]
        ),
        Template(
            id: "fairy-garden",
            name: "Fairy Garden",
            description: "A tiny world, very close by.",
            icon: "leaf.fill",
            glyph: "\u{273F}", // ✿
            gradient: [DesignTokens.Colors.cardRose, DesignTokens.Colors.cardRoseDeep],
            fields: [
                TemplateField(id: "favoriteColor", label: "Favourite colour", type: .color)
            ]
        ),
        Template(
            id: "snowy-mountain",
            name: "Snowy Mountain",
            description: "Warm hands, slow snow falling.",
            icon: "snowflake",
            glyph: "\u{2744}", // ❄
            gradient: [DesignTokens.Colors.cardSnow, DesignTokens.Colors.cardSnowDeep],
            fields: [
                TemplateField(id: "favoriteAnimal", label: "Favourite animal", type: .animal)
            ]
        ),
        Template(
            id: "rainy-day-cozy",
            name: "Rainy Day",
            description: "Curl up and listen to the rain.",
            icon: "cloud.rain.fill",
            glyph: "\u{2042}", // ⁂
            gradient: [DesignTokens.Colors.cardRain, DesignTokens.Colors.cardRainDeep],
            fields: [
                TemplateField(id: "favoriteThing", label: "Favourite thing", type: .text)
            ]
        ),
    ]
}
