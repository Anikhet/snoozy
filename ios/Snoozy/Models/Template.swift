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
    ]
}
