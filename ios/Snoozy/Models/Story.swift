import Foundation

/// A generated bedtime story with its metadata and local audio file reference.
struct Story: Codable, Identifiable {
    let id: UUID
    let title: String
    let storyText: String
    let templateId: String
    let childName: String
    let createdAt: Date
    let audioFileName: String

    /// Full path to the locally stored audio file.
    var audioFileURL: URL? {
        let documentsDir = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first
        return documentsDir?.appendingPathComponent("Audio/\(audioFileName)")
    }
}
