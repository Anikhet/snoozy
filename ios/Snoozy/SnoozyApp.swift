import SwiftUI
import AVFoundation

@main
struct SnoozyApp: App {
    init() {
        configureAudioSession()
    }

    var body: some Scene {
        WindowGroup {
            ContentRouter()
        }
    }

    /// Configures AVAudioSession for background playback with spoken audio mode.
    /// This allows audio to continue playing when the phone is locked.
    private func configureAudioSession() {
        do {
            let session = AVAudioSession.sharedInstance()
            try session.setCategory(.playback, mode: .spokenAudio)
            try session.setActive(true)
        } catch {
            print("Failed to configure audio session: \(error.localizedDescription)")
        }
    }
}
