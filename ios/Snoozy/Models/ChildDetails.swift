import Foundation

/// Form input collected from the parent about their child.
/// Sent to the backend for story generation.
struct ChildDetails: Codable {
    var name: String = ""
    var age: Int = 3
    var favoriteColor: String?
    var favoriteAnimal: String?
    var favoriteThing: String?

    /// Returns true if all required fields for the given template are filled.
    func isValid(for templateId: String) -> Bool {
        guard !name.trimmingCharacters(in: .whitespaces).isEmpty else { return false }

        switch templateId {
        case "dreamland":
            return favoriteColor != nil && !favoriteColor!.isEmpty
        case "animal-friends":
            return favoriteAnimal != nil && !favoriteAnimal!.isEmpty
        case "under-the-stars":
            return favoriteThing != nil && !favoriteThing!.isEmpty
        default:
            return false
        }
    }
}
