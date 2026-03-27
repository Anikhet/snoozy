import Foundation

/// Handles all network communication with the Snoozy backend.
/// Provides typed methods for story generation and audio download.
actor APIService {
    private let baseURL: String

    init(baseURL: String = AppConfig.backendURL) {
        self.baseURL = baseURL
    }

    // MARK: - Response Types

    struct StoryResponse: Codable {
        let success: Bool
        let title: String?
        let storyText: String?
        let error: String?
    }

    struct ErrorResponse: Codable {
        let success: Bool
        let error: String?
    }

    // MARK: - Generate Story

    /// Sends template + child details to the backend and returns the generated story.
    func generateStory(templateId: String, childDetails: ChildDetails) async throws -> (title: String, text: String) {
        let url = URL(string: "\(baseURL)/api/generate-story")!

        var body: [String: Any] = [
            "templateId": templateId,
            "childDetails": [
                "name": childDetails.name,
                "age": childDetails.age,
            ] as [String: Any],
        ]

        var details = body["childDetails"] as! [String: Any]
        if let color = childDetails.favoriteColor { details["favoriteColor"] = color }
        if let animal = childDetails.favoriteAnimal { details["favoriteAnimal"] = animal }
        if let thing = childDetails.favoriteThing { details["favoriteThing"] = thing }
        body["childDetails"] = details

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        request.timeoutInterval = 60

        let (data, response) = try await URLSession.shared.data(for: request)
        let httpResponse = response as! HTTPURLResponse

        guard httpResponse.statusCode == 200 else {
            let errorResponse = try? JSONDecoder().decode(ErrorResponse.self, from: data)
            throw APIError.serverError(errorResponse?.error ?? "Story generation failed")
        }

        let storyResponse = try JSONDecoder().decode(StoryResponse.self, from: data)

        guard let title = storyResponse.title, let text = storyResponse.storyText else {
            throw APIError.serverError("No story content received")
        }

        return (title, text)
    }

    // MARK: - Generate Audio

    /// Sends story text to the backend and downloads the MP3 audio data.
    func generateAudio(text: String) async throws -> Data {
        let url = URL(string: "\(baseURL)/api/generate-audio")!

        let body = ["text": text]

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        request.timeoutInterval = 120

        let (data, response) = try await URLSession.shared.data(for: request)
        let httpResponse = response as! HTTPURLResponse

        guard httpResponse.statusCode == 200 else {
            throw APIError.serverError("Audio generation failed")
        }

        guard !data.isEmpty else {
            throw APIError.serverError("Empty audio response")
        }

        return data
    }
}

// MARK: - Errors

enum APIError: LocalizedError {
    case serverError(String)
    case networkError(String)

    var errorDescription: String? {
        switch self {
        case .serverError(let message): return message
        case .networkError(let message): return message
        }
    }
}
