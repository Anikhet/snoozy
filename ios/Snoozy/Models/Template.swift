import SwiftUI

/// A story template that defines the theme, form fields, and visual style.
struct Template: Identifiable {
    let id: String
    let name: String
    let description: String
    let icon: String
    let cardColor: Color
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
            name: "Dreamland Adventure",
            description: "A magical journey through dreams",
            icon: "moon.stars.fill",
            cardColor: DesignTokens.Colors.cardLavender,
            fields: [
                TemplateField(id: "favoriteColor", label: "Favorite Color", type: .color)
            ]
        ),
        Template(
            id: "animal-friends",
            name: "Animal Friends",
            description: "Befriend animals in a whispering forest",
            icon: "hare.fill",
            cardColor: DesignTokens.Colors.cardPeach,
            fields: [
                TemplateField(id: "favoriteAnimal", label: "Favorite Animal", type: .animal)
            ]
        ),
        Template(
            id: "under-the-stars",
            name: "Under the Stars",
            description: "Explore the peaceful night sky",
            icon: "sparkles",
            cardColor: DesignTokens.Colors.cardMint,
            fields: [
                TemplateField(id: "favoriteThing", label: "Favorite Thing", type: .text)
            ]
        ),
        Template(
            id: "underwater-journey",
            name: "Underwater Journey",
            description: "Drift through a gentle ocean world",
            icon: "water.waves",
            cardColor: DesignTokens.Colors.cardOcean,
            fields: [
                TemplateField(id: "favoriteColor", label: "Favorite Color", type: .color)
            ]
        ),
        Template(
            id: "space-explorer",
            name: "Space Explorer",
            description: "A slow, peaceful trip through the cosmos",
            icon: "moonphase.waning.crescent",
            cardColor: DesignTokens.Colors.cardCosmos,
            fields: [
                TemplateField(id: "favoriteThing", label: "Favorite Thing", type: .text)
            ]
        ),
        Template(
            id: "fairy-garden",
            name: "Fairy Garden",
            description: "Wander through a tiny magical garden",
            icon: "leaf.fill",
            cardColor: DesignTokens.Colors.cardRose,
            fields: [
                TemplateField(id: "favoriteColor", label: "Favorite Color", type: .color)
            ]
        ),
        Template(
            id: "snowy-mountain",
            name: "Snowy Mountain",
            description: "A cozy adventure in gentle snowfall",
            icon: "snowflake",
            cardColor: DesignTokens.Colors.cardSnow,
            fields: [
                TemplateField(id: "favoriteAnimal", label: "Favorite Animal", type: .animal)
            ]
        ),
        Template(
            id: "rainy-day-cozy",
            name: "Rainy Day Cozy",
            description: "Curl up and listen to the rain",
            icon: "cloud.rain.fill",
            cardColor: DesignTokens.Colors.cardRain,
            fields: [
                TemplateField(id: "favoriteThing", label: "Favorite Thing", type: .text)
            ]
        ),
    ]
}
