import Foundation

/// Manages local persistence of stories and audio files.
/// Audio files are stored in Documents/Audio/ via FileManager.
/// Story metadata is stored as JSON in UserDefaults.
actor StorageService {
    private let storageKey = "snoozy_stories"
    private let fileManager = FileManager.default

    /// Directory where audio MP3 files are saved.
    private var audioDirectory: URL {
        let docs = fileManager.urls(for: .documentDirectory, in: .userDomainMask).first!
        return docs.appendingPathComponent("Audio")
    }

    init() {
        let docs = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first!
        let audioDir = docs.appendingPathComponent("Audio")
        if !FileManager.default.fileExists(atPath: audioDir.path) {
            try? FileManager.default.createDirectory(at: audioDir, withIntermediateDirectories: true)
        }
    }

    // MARK: - Audio Files

    /// Saves raw MP3 data to disk and returns the generated filename.
    func saveAudioFile(data: Data) throws -> String {
        createAudioDirectoryIfNeeded()
        let fileName = "\(UUID().uuidString).mp3"
        let fileURL = audioDirectory.appendingPathComponent(fileName)
        try data.write(to: fileURL)
        return fileName
    }

    /// Returns the full URL for a stored audio file.
    func audioFileURL(fileName: String) -> URL {
        audioDirectory.appendingPathComponent(fileName)
    }

    /// Deletes an audio file from disk.
    func deleteAudioFile(fileName: String) {
        let fileURL = audioDirectory.appendingPathComponent(fileName)
        try? fileManager.removeItem(at: fileURL)
    }

    // MARK: - Story Metadata

    /// Loads all saved stories from UserDefaults, sorted newest first.
    func loadStories() -> [Story] {
        guard let data = UserDefaults.standard.data(forKey: storageKey) else {
            return []
        }
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        return (try? decoder.decode([Story].self, from: data))?.sorted { $0.createdAt > $1.createdAt } ?? []
    }

    /// Saves a new story to the stored list.
    func saveStory(_ story: Story) {
        var stories = loadStories()
        stories.insert(story, at: 0)
        persistStories(stories)
    }

    /// Removes a story and its audio file.
    func deleteStory(_ story: Story) {
        deleteAudioFile(fileName: story.audioFileName)
        var stories = loadStories()
        stories.removeAll { $0.id == story.id }
        persistStories(stories)
    }

    // MARK: - Private

    private func createAudioDirectoryIfNeeded() {
        if !fileManager.fileExists(atPath: audioDirectory.path) {
            try? fileManager.createDirectory(at: audioDirectory, withIntermediateDirectories: true)
        }
    }

    private func persistStories(_ stories: [Story]) {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        if let data = try? encoder.encode(stories) {
            UserDefaults.standard.set(data, forKey: storageKey)
        }
    }
}
