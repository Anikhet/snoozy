import Foundation

/// Tracks whether a story is still being generated or is ready to play.
enum StoryStatus: String, Codable {
    case generating
    case ready
    case failed
}

/// A generated bedtime story with its metadata and local audio file reference.
struct Story: Codable, Identifiable {
    let id: UUID
    var title: String
    var storyText: String
    let templateId: String
    let childName: String
    let createdAt: Date
    var audioFileName: String
    var status: StoryStatus

    /// Full path to the locally stored audio file.
    var audioFileURL: URL? {
        guard status == .ready else { return nil }
        let documentsDir = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first
        return documentsDir?.appendingPathComponent("Audio/\(audioFileName)")
    }

    /// Creates a placeholder story shown in the list while generation is in progress.
    static func placeholder(id: UUID, templateId: String, childName: String) -> Story {
        Story(
            id: id,
            title: "Creating story for \(childName)...",
            storyText: "",
            templateId: templateId,
            childName: childName,
            createdAt: Date(),
            audioFileName: "",
            status: .generating
        )
    }
}
