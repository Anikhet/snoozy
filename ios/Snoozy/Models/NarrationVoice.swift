import Foundation

/// A selectable TTS voice option with a user-friendly display name.
struct NarrationVoice: Identifiable, Equatable {
    let id: String
    let displayName: String
    let description: String
}

/// Available narration voices for story audio.
enum NarrationVoices {
    static let all: [NarrationVoice] = [
        NarrationVoice(id: "shimmer", displayName: "Luna", description: "Warm & gentle"),
        NarrationVoice(id: "nova", displayName: "Sage", description: "Calm & clear"),
        NarrationVoice(id: "onyx", displayName: "Bear", description: "Deep & soothing"),
        NarrationVoice(id: "fable", displayName: "Meadow", description: "Soft & storytelling"),
    ]

    static let defaultVoice = all[0]
}
