import SwiftUI

/// Story form — editorial prompts, large name field, chip age picker,
/// color dots, voice grid. CTA floats above a bottom fade.
struct StoryFormView: View {
    let template: Template
    @Binding var childDetails: ChildDetails
    let onGenerate: () -> Void
    let onBack: () -> Void

    @FocusState private var nameFocused: Bool
    @FocusState private var thingFocused: Bool

    private var isFormValid: Bool {
        childDetails.isValid(for: template.id)
    }

    private let ages = Array(AppConfig.ageRange)

    var body: some View {
        ZStack(alignment: .bottom) {
            ScrollView(showsIndicators: false) {
                VStack(alignment: .leading, spacing: 0) {
                    header
                    templateChip
                        .padding(.horizontal, DesignTokens.Spacing.lg)
                        .padding(.top, 22)
                    title
                        .padding(.horizontal, DesignTokens.Spacing.lg)
                        .padding(.top, 12)

                    VStack(alignment: .leading, spacing: 20) {
                        nameField
                        agePicker
                        ForEach(template.fields) { field in
                            switch field.type {
                            case .color:  colorDots(field: field)
                            case .animal: animalChips(field: field)
                            case .text:   freeTextField(field: field)
                            }
                        }
                        voiceGrid
                    }
                    .padding(.horizontal, DesignTokens.Spacing.lg)
                    .padding(.top, 22)

                    Spacer(minLength: 140)
                }
            }
            .scrollClipDisabled()

            bottomCTA
        }
        .background(DesignTokens.Colors.background)
    }

    // MARK: - Header

    private var header: some View {
        HStack(spacing: 14) {
            Button(action: onBack) {
                ZStack {
                    Circle()
                        .fill(DesignTokens.Colors.surface)
                        .overlay(Circle().stroke(DesignTokens.Colors.hair, lineWidth: 1))
                    Image(systemName: "chevron.left")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(DesignTokens.Colors.ink)
                }
                .frame(width: 38, height: 38)
            }
            .buttonStyle(.plain)
            Text("STEP 2 OF 3")
                .font(DesignTokens.Fonts.eyebrow)
                .kerning(2)
                .foregroundStyle(DesignTokens.Colors.inkMute)
            Spacer()
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
        .padding(.top, 8)
    }

    // MARK: - Template chip

    private var templateChip: some View {
        HStack(spacing: 6) {
            Text(template.glyph)
                .font(.system(size: 14, weight: .regular, design: .serif))
                .foregroundStyle(DesignTokens.Colors.ink)
            Text(template.name)
                .font(.system(size: 12, weight: .bold, design: .rounded))
                .foregroundStyle(DesignTokens.Colors.ink)
        }
        .padding(.vertical, 6)
        .padding(.horizontal, 12)
        .background(
            Capsule().fill(
                LinearGradient(
                    colors: template.gradient,
                    startPoint: .topLeading, endPoint: .bottomTrailing
                )
            )
        )
        .overlay(Capsule().stroke(Color.white.opacity(0.7), lineWidth: 1))
    }

    // MARK: - Title

    private var title: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text("Tell us about")
                .font(.system(size: 30, weight: .regular, design: .serif))
                .kerning(-0.6)
                .foregroundStyle(DesignTokens.Colors.ink)
            Text("the dreamer.")
                .font(.system(size: 30, weight: .regular, design: .serif))
                .italic()
                .kerning(-0.6)
                .foregroundStyle(DesignTokens.Colors.primary)
        }
    }

    // MARK: - Fields

    private var nameField: some View {
        VStack(alignment: .leading, spacing: 6) {
            eyebrow("Their name")
            TextField("Enter name", text: $childDetails.name)
                .font(.system(size: 20, weight: .medium, design: .serif))
                .italic()
                .foregroundStyle(DesignTokens.Colors.ink)
                .focused($nameFocused)
                .textFieldStyle(.plain)
                .padding(.horizontal, 18)
                .frame(height: 52)
                .background(DesignTokens.Colors.surface)
                .overlay(
                    RoundedRectangle(cornerRadius: 16, style: .continuous)
                        .stroke(DesignTokens.Colors.hair, lineWidth: 1)
                )
                .clipShape(.rect(cornerRadius: 16))
        }
    }

    private var agePicker: some View {
        VStack(alignment: .leading, spacing: 8) {
            eyebrow("Their age")
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    ForEach(ages, id: \.self) { age in
                        Button { childDetails.age = age } label: {
                            let selected = childDetails.age == age
                            Text("\(age)")
                                .font(.system(size: 18, weight: .medium, design: .serif))
                                .foregroundStyle(selected ? DesignTokens.Colors.background : DesignTokens.Colors.ink)
                                .frame(width: 40, height: 48)
                                .background(selected ? DesignTokens.Colors.ink : DesignTokens.Colors.surface)
                                .clipShape(.rect(cornerRadius: 14))
                                .overlay(
                                    RoundedRectangle(cornerRadius: 14, style: .continuous)
                                        .stroke(selected ? Color.clear : DesignTokens.Colors.hair, lineWidth: 1)
                                )
                                .shadow(color: selected ? DesignTokens.Colors.ink.opacity(0.22) : .clear, radius: 6, x: 0, y: 6)
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(.vertical, 4)
            }
        }
    }

    private func colorDots(field: TemplateField) -> some View {
        let colors: [(name: String, color: Color)] = [
            ("Rose",  .hex(0xE9A6B3)),
            ("Sky",   .hex(0x94B9D6)),
            ("Sun",   .hex(0xE9C77A)),
            ("Moss",  .hex(0xA7C7A1)),
            ("Plum",  .hex(0x9B8CC2)),
            ("Peach", .hex(0xF0B393)),
        ]
        return VStack(alignment: .leading, spacing: 10) {
            eyebrow(field.label)
            HStack(spacing: 12) {
                ForEach(colors, id: \.name) { entry in
                    Button {
                        childDetails.favoriteColor = entry.name
                    } label: {
                        let selected = childDetails.favoriteColor == entry.name
                        ZStack {
                            Circle().fill(entry.color)
                                .overlay(
                                    Circle().stroke(DesignTokens.Colors.ink, lineWidth: selected ? 3 : 0)
                                )
                                .overlay(
                                    Circle()
                                        .fill(Color.white.opacity(0.5))
                                        .blendMode(.plusLighter)
                                        .frame(width: 10, height: 5)
                                        .offset(y: -10)
                                )
                            if selected {
                                Circle()
                                    .stroke(DesignTokens.Colors.ink.opacity(0.2), lineWidth: 1)
                                    .frame(width: 54, height: 54)
                            }
                        }
                        .frame(width: 38, height: 38)
                    }
                    .buttonStyle(.plain)
                }
            }
            if let picked = childDetails.favoriteColor {
                Text("\(picked) it is.")
                    .font(.system(size: 13, design: .serif))
                    .italic()
                    .foregroundStyle(DesignTokens.Colors.inkSoft)
                    .padding(.top, 2)
            }
        }
    }

    private func animalChips(field: TemplateField) -> some View {
        let animals = ["Bunny", "Bear", "Fox", "Owl", "Deer", "Cat", "Dog", "Elephant"]
        return VStack(alignment: .leading, spacing: 8) {
            eyebrow(field.label)
            FlowLayout(spacing: 8) {
                ForEach(animals, id: \.self) { a in
                    Button {
                        childDetails.favoriteAnimal = a
                    } label: {
                        let selected = childDetails.favoriteAnimal == a
                        Text(a)
                            .font(.system(size: 13, weight: .semibold, design: .rounded))
                            .foregroundStyle(selected ? DesignTokens.Colors.background : DesignTokens.Colors.ink)
                            .padding(.horizontal, 14)
                            .padding(.vertical, 10)
                            .background(selected ? DesignTokens.Colors.ink : DesignTokens.Colors.surface)
                            .clipShape(Capsule())
                            .overlay(
                                Capsule().stroke(selected ? Color.clear : DesignTokens.Colors.hair, lineWidth: 1)
                            )
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }

    private func freeTextField(field: TemplateField) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            eyebrow(field.label)
            TextField(
                "e.g. dinosaurs, rainbows, rockets",
                text: Binding(
                    get: { childDetails.favoriteThing ?? "" },
                    set: { childDetails.favoriteThing = $0 }
                )
            )
            .font(.system(size: 16, design: .rounded))
            .focused($thingFocused)
            .textFieldStyle(.plain)
            .padding(.horizontal, 18)
            .frame(height: 52)
            .background(DesignTokens.Colors.surface)
            .overlay(
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .stroke(DesignTokens.Colors.hair, lineWidth: 1)
            )
            .clipShape(.rect(cornerRadius: 16))
        }
    }

    // MARK: - Voice grid

    private var voiceGrid: some View {
        VStack(alignment: .leading, spacing: 8) {
            eyebrow("Narrator")
            LazyVGrid(columns: [GridItem(.flexible(), spacing: 8), GridItem(.flexible(), spacing: 8)], spacing: 8) {
                ForEach(NarrationVoices.all) { v in
                    Button {
                        childDetails.voiceId = v.id
                    } label: {
                        let selected = childDetails.voiceId == v.id
                        VStack(alignment: .leading, spacing: 2) {
                            Text(v.displayName)
                                .font(.system(size: 15, weight: .medium, design: .serif))
                            Text(v.description)
                                .font(.system(size: 10.5, design: .rounded))
                                .opacity(0.75)
                        }
                        .foregroundStyle(selected ? DesignTokens.Colors.background : DesignTokens.Colors.ink)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.horizontal, 14)
                        .frame(height: 58)
                        .background(selected ? DesignTokens.Colors.ink : DesignTokens.Colors.surface)
                        .clipShape(.rect(cornerRadius: 16))
                        .overlay(
                            RoundedRectangle(cornerRadius: 16, style: .continuous)
                                .stroke(selected ? Color.clear : DesignTokens.Colors.hair, lineWidth: 1)
                        )
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }

    // MARK: - Bottom CTA

    private var bottomCTA: some View {
        VStack(spacing: 0) {
            LinearGradient(
                colors: [DesignTokens.Colors.background.opacity(0), DesignTokens.Colors.background],
                startPoint: .top, endPoint: .center
            )
            .frame(height: 28)

            SnoozyButton(title: "Begin the story", icon: "sparkles", style: .indigo) {
                onGenerate()
            }
            .padding(.horizontal, DesignTokens.Spacing.lg)
            .padding(.bottom, 30)
            .background(DesignTokens.Colors.background)
            .opacity(isFormValid ? 1 : 0.55)
            .disabled(!isFormValid)
        }
    }

    // MARK: - Small helpers

    private func eyebrow(_ text: String) -> some View {
        Text(text.uppercased())
            .font(.system(size: 11, weight: .bold, design: .rounded))
            .kerning(1)
            .foregroundStyle(DesignTokens.Colors.inkMute)
    }
}

// MARK: - Flow Layout (reused)

/// A simple wrapping layout for chip pickers.
struct FlowLayout: Layout {
    var spacing: CGFloat = 8

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        arrangeSubviews(proposal: proposal, subviews: subviews).size
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        let result = arrangeSubviews(proposal: proposal, subviews: subviews)
        for (i, pos) in result.positions.enumerated() {
            subviews[i].place(at: CGPoint(x: bounds.minX + pos.x, y: bounds.minY + pos.y), proposal: .unspecified)
        }
    }

    private func arrangeSubviews(proposal: ProposedViewSize, subviews: Subviews) -> (positions: [CGPoint], size: CGSize) {
        let maxWidth = proposal.width ?? .infinity
        var positions: [CGPoint] = []
        var x: CGFloat = 0
        var y: CGFloat = 0
        var rowHeight: CGFloat = 0
        var totalHeight: CGFloat = 0
        for sv in subviews {
            let size = sv.sizeThatFits(.unspecified)
            if x + size.width > maxWidth, x > 0 {
                x = 0
                y += rowHeight + spacing
                rowHeight = 0
            }
            positions.append(CGPoint(x: x, y: y))
            rowHeight = max(rowHeight, size.height)
            x += size.width + spacing
            totalHeight = y + rowHeight
        }
        return (positions, CGSize(width: maxWidth, height: totalHeight))
    }
}
