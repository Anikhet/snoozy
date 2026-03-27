import Foundation

/// App-wide configuration constants.
enum AppConfig {
    /// The base URL for the Snoozy backend API.
    /// Change this to your deployed server URL for production.
    static let backendURL = "http://localhost:3001"

    /// Maximum story text length sent for audio generation.
    static let maxStoryLength = 5000

    /// Child age range for the picker.
    static let ageRange = 1...10
}
