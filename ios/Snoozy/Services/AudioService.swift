import AVFoundation
import MediaPlayer

/// Manages audio playback with background support and lock screen controls.
/// Uses AVAudioPlayer for local MP3 files and registers with MPNowPlayingInfoCenter
/// so the story title + controls appear on the lock screen and Control Center.
@MainActor
@Observable
final class AudioService: NSObject {
    var isPlaying = false
    var currentTime: TimeInterval = 0
    var duration: TimeInterval = 0
    var currentStoryTitle: String?

    private var player: AVAudioPlayer?
    private var displayLink: CADisplayLink?

    override init() {
        super.init()
        setupRemoteCommands()
        observeInterruptions()
    }

    // MARK: - Playback Controls

    /// Loads an MP3 file from the given URL and begins playback.
    func play(url: URL, title: String) {
        stop()

        do {
            player = try AVAudioPlayer(contentsOf: url)
            player?.delegate = self
            player?.prepareToPlay()
            player?.play()

            isPlaying = true
            duration = player?.duration ?? 0
            currentStoryTitle = title

            startProgressUpdates()
            updateNowPlayingInfo()
        } catch {
            print("AudioService: Failed to play - \(error.localizedDescription)")
        }
    }

    func togglePlayPause() {
        guard let player else { return }

        if player.isPlaying {
            player.pause()
            isPlaying = false
            stopProgressUpdates()
        } else {
            player.play()
            isPlaying = true
            startProgressUpdates()
        }
        updateNowPlayingInfo()
    }

    func stop() {
        player?.stop()
        player = nil
        isPlaying = false
        currentTime = 0
        duration = 0
        currentStoryTitle = nil
        stopProgressUpdates()
        clearNowPlayingInfo()
    }

    /// Seeks to a specific time in the audio.
    func seek(to time: TimeInterval) {
        player?.currentTime = time
        currentTime = time
        updateNowPlayingInfo()
    }

    // MARK: - Progress Updates

    private func startProgressUpdates() {
        stopProgressUpdates()
        displayLink = CADisplayLink(target: self, selector: #selector(updateProgress))
        displayLink?.preferredFrameRateRange = CAFrameRateRange(minimum: 4, maximum: 15)
        displayLink?.add(to: .main, forMode: .common)
    }

    private func stopProgressUpdates() {
        displayLink?.invalidate()
        displayLink = nil
    }

    @objc private func updateProgress() {
        guard let player else { return }
        currentTime = player.currentTime
    }

    // MARK: - Lock Screen / Control Center

    /// Registers play/pause commands so hardware buttons and lock screen controls work.
    private func setupRemoteCommands() {
        let commandCenter = MPRemoteCommandCenter.shared()

        commandCenter.playCommand.addTarget { [weak self] _ in
            guard let self else { return .commandFailed }
            Task { @MainActor in
                self.player?.play()
                self.isPlaying = true
                self.startProgressUpdates()
                self.updateNowPlayingInfo()
            }
            return .success
        }

        commandCenter.pauseCommand.addTarget { [weak self] _ in
            guard let self else { return .commandFailed }
            Task { @MainActor in
                self.player?.pause()
                self.isPlaying = false
                self.stopProgressUpdates()
                self.updateNowPlayingInfo()
            }
            return .success
        }

        commandCenter.changePlaybackPositionCommand.addTarget { [weak self] event in
            guard let self,
                  let positionEvent = event as? MPChangePlaybackPositionCommandEvent else {
                return .commandFailed
            }
            Task { @MainActor in
                self.seek(to: positionEvent.positionTime)
            }
            return .success
        }
    }

    /// Updates the Now Playing info panel on the lock screen.
    private func updateNowPlayingInfo() {
        var info = [String: Any]()
        info[MPMediaItemPropertyTitle] = currentStoryTitle ?? "Snoozy Story"
        info[MPMediaItemPropertyArtist] = "Snoozy"
        info[MPMediaItemPropertyPlaybackDuration] = duration
        info[MPNowPlayingInfoPropertyElapsedPlaybackTime] = currentTime
        info[MPNowPlayingInfoPropertyPlaybackRate] = isPlaying ? 1.0 : 0.0
        MPNowPlayingInfoCenter.default().nowPlayingInfo = info
    }

    private func clearNowPlayingInfo() {
        MPNowPlayingInfoCenter.default().nowPlayingInfo = nil
    }

    // MARK: - Audio Interruptions

    /// Handles phone calls and other audio interruptions gracefully.
    private func observeInterruptions() {
        NotificationCenter.default.addObserver(
            forName: AVAudioSession.interruptionNotification,
            object: nil,
            queue: .main
        ) { [weak self] notification in
            guard let self,
                  let typeValue = notification.userInfo?[AVAudioSessionInterruptionTypeKey] as? UInt,
                  let type = AVAudioSession.InterruptionType(rawValue: typeValue) else { return }

            Task { @MainActor in
                switch type {
                case .began:
                    self.player?.pause()
                    self.isPlaying = false
                    self.stopProgressUpdates()
                case .ended:
                    if let optionsValue = notification.userInfo?[AVAudioSessionInterruptionOptionKey] as? UInt {
                        let options = AVAudioSession.InterruptionOptions(rawValue: optionsValue)
                        if options.contains(.shouldResume) {
                            self.player?.play()
                            self.isPlaying = true
                            self.startProgressUpdates()
                        }
                    }
                @unknown default:
                    break
                }
                self.updateNowPlayingInfo()
            }
        }
    }
}

// MARK: - AVAudioPlayerDelegate

extension AudioService: AVAudioPlayerDelegate {
    nonisolated func audioPlayerDidFinishPlaying(_ player: AVAudioPlayer, successfully flag: Bool) {
        Task { @MainActor in
            self.isPlaying = false
            self.currentTime = 0
            self.stopProgressUpdates()
            self.updateNowPlayingInfo()
        }
    }
}
