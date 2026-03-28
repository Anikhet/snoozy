import Foundation

/// Form input collected from the parent about their child.
/// Sent to the backend for story generation.
struct ChildDetails: Codable {
    var name: String = ""
    var age: Int = 3
    var favoriteColor: String?
    var favoriteAnimal: String?
    var favoriteThing: String?

    /// The TTS voice ID to use for narration (not sent to generate-story, only generate-audio).
    var voiceId: String = NarrationVoices.defaultVoice.id

    /// Returns true if all required fields for the given template are filled.
    /// Validates against the template's field definitions to stay in sync.
    func isValid(for templateId: String) -> Bool {
        guard !name.trimmingCharacters(in: .whitespaces).isEmpty else { return false }

        guard let template = Templates.all.first(where: { $0.id == templateId }) else {
            return false
        }

        return template.fields.allSatisfy { field in
            switch field.type {
            case .color:
                return favoriteColor != nil && !favoriteColor!.isEmpty
            case .animal:
                return favoriteAnimal != nil && !favoriteAnimal!.isEmpty
            case .text:
                return favoriteThing != nil && !favoriteThing!.isEmpty
            }
        }
    }
}
