import SwiftUI

/// Collects child details (name, age, template-specific field) and triggers story generation.
struct StoryFormView: View {
    let template: Template
    @Binding var childDetails: ChildDetails
    let errorMessage: String?
    let onGenerate: () -> Void
    let onBack: () -> Void

    private var isFormValid: Bool {
        childDetails.isValid(for: template.id)
    }

    var body: some View {
        VStack(spacing: DesignTokens.Spacing.lg) {
            header

            ScrollView(showsIndicators: false) {
                VStack(spacing: DesignTokens.Spacing.lg) {
                    templateBadge
                    nameField
                    agePicker
                    templateSpecificField
                    errorBanner
                    generateButton
                }
                .padding(.bottom, DesignTokens.Spacing.xxl)
            }
            .scrollClipDisabled()
        }
        .padding(.horizontal, DesignTokens.Spacing.lg)
        .padding(.top, DesignTokens.Spacing.lg)
    }

    // MARK: - Header

    private var header: some View {
        HStack {
            Button(action: onBack) {
                Image(systemName: "chevron.left")
                    .font(.title3.weight(.medium))
                    .foregroundStyle(DesignTokens.Colors.primary)
            }
            Spacer()
        }
    }

    // MARK: - Template Badge

    private var templateBadge: some View {
        HStack(spacing: DesignTokens.Spacing.sm) {
            Image(systemName: template.icon)
                .font(.title2)
            Text(template.name)
                .font(DesignTokens.Fonts.title)
        }
        .foregroundStyle(DesignTokens.Colors.textPrimary)
    }

    // MARK: - Form Fields

    private var nameField: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
            Text("Child's Name")
                .font(DesignTokens.Fonts.caption)
                .foregroundStyle(DesignTokens.Colors.textSecondary)

            TextField("Enter name", text: $childDetails.name)
                .font(DesignTokens.Fonts.body)
                .padding(DesignTokens.Spacing.md)
                .background(DesignTokens.Colors.surface)
                .clipShape(.rect(cornerRadius: DesignTokens.Radii.small))
                .snoozyCardShadow()
        }
    }

    private var agePicker: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
            Text("Age")
                .font(DesignTokens.Fonts.caption)
                .foregroundStyle(DesignTokens.Colors.textSecondary)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: DesignTokens.Spacing.sm) {
                    ForEach(Array(AppConfig.ageRange), id: \.self) { age in
                        ageButton(age)
                    }
                }
                .padding(.vertical, DesignTokens.Spacing.xs)
            }
        }
    }

    private func ageButton(_ age: Int) -> some View {
        Button {
            childDetails.age = age
        } label: {
            Text("\(age)")
                .font(DesignTokens.Fonts.headline)
                .frame(width: 40, height: 40)
                .foregroundStyle(
                    childDetails.age == age
                        ? .white
                        : DesignTokens.Colors.textPrimary
                )
                .background(
                    childDetails.age == age
                        ? DesignTokens.Colors.primary
                        : DesignTokens.Colors.surface
                )
                .clipShape(.rect(cornerRadius: DesignTokens.Radii.small))
                .snoozyCardShadow()
        }
    }

    // MARK: - Template-Specific Field

    @ViewBuilder
    private var templateSpecificField: some View {
        ForEach(template.fields) { field in
            switch field.type {
            case .color:
                colorPicker(field: field)
            case .animal:
                animalPicker(field: field)
            case .text:
                textField(field: field)
            }
        }
    }

    private func colorPicker(field: TemplateField) -> some View {
        let colors = ["Red", "Blue", "Purple", "Pink", "Green", "Yellow", "Orange"]
        return fieldSection(label: field.label) {
            wrappedChipPicker(
                options: colors,
                selected: childDetails.favoriteColor,
                onSelect: { childDetails.favoriteColor = $0 }
            )
        }
    }

    private func animalPicker(field: TemplateField) -> some View {
        let animals = ["Bunny", "Bear", "Fox", "Owl", "Deer", "Cat", "Dog", "Elephant"]
        return fieldSection(label: field.label) {
            wrappedChipPicker(
                options: animals,
                selected: childDetails.favoriteAnimal,
                onSelect: { childDetails.favoriteAnimal = $0 }
            )
        }
    }

    private func textField(field: TemplateField) -> some View {
        fieldSection(label: field.label) {
            TextField("e.g. dinosaurs, rainbows, rockets", text: Binding(
                get: { childDetails.favoriteThing ?? "" },
                set: { childDetails.favoriteThing = $0 }
            ))
            .font(DesignTokens.Fonts.body)
            .padding(DesignTokens.Spacing.md)
            .background(DesignTokens.Colors.surface)
            .clipShape(.rect(cornerRadius: DesignTokens.Radii.small))
            .snoozyCardShadow()
        }
    }

    // MARK: - Helpers

    private func fieldSection<Content: View>(label: String, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
            Text(label)
                .font(DesignTokens.Fonts.caption)
                .foregroundStyle(DesignTokens.Colors.textSecondary)
            content()
        }
    }

    private func wrappedChipPicker(
        options: [String],
        selected: String?,
        onSelect: @escaping (String) -> Void
    ) -> some View {
        FlowLayout(spacing: DesignTokens.Spacing.sm) {
            ForEach(options, id: \.self) { option in
                Button { onSelect(option) } label: {
                    Text(option)
                        .font(DesignTokens.Fonts.caption)
                        .padding(.horizontal, DesignTokens.Spacing.md)
                        .padding(.vertical, DesignTokens.Spacing.sm)
                        .foregroundStyle(
                            selected == option ? .white : DesignTokens.Colors.textPrimary
                        )
                        .background(
                            selected == option
                                ? DesignTokens.Colors.primary
                                : DesignTokens.Colors.surface
                        )
                        .clipShape(.rect(cornerRadius: DesignTokens.Radii.small))
                        .snoozyCardShadow()
                }
            }
        }
    }

    // MARK: - Error & Generate

    @ViewBuilder
    private var errorBanner: some View {
        if let errorMessage {
            HStack(spacing: DesignTokens.Spacing.sm) {
                Image(systemName: "exclamationmark.triangle.fill")
                Text(errorMessage)
                    .font(DesignTokens.Fonts.caption)
            }
            .foregroundStyle(DesignTokens.Colors.error)
            .padding(DesignTokens.Spacing.md)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(DesignTokens.Colors.error.opacity(0.1))
            .clipShape(.rect(cornerRadius: DesignTokens.Radii.small))
        }
    }

    private var generateButton: some View {
        SnoozyButton(title: "Story Time!", icon: "sparkles") {
            onGenerate()
        }
        .opacity(isFormValid ? 1 : 0.5)
        .disabled(!isFormValid)
    }
}

// MARK: - Flow Layout

/// A simple wrapping layout for chip pickers.
struct FlowLayout: Layout {
    var spacing: CGFloat = 8

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let result = arrangeSubviews(proposal: proposal, subviews: subviews)
        return result.size
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        let result = arrangeSubviews(proposal: proposal, subviews: subviews)
        for (index, position) in result.positions.enumerated() {
            subviews[index].place(at: CGPoint(x: bounds.minX + position.x, y: bounds.minY + position.y), proposal: .unspecified)
        }
    }

    private func arrangeSubviews(proposal: ProposedViewSize, subviews: Subviews) -> (positions: [CGPoint], size: CGSize) {
        let maxWidth = proposal.width ?? .infinity
        var positions: [CGPoint] = []
        var x: CGFloat = 0
        var y: CGFloat = 0
        var rowHeight: CGFloat = 0
        var totalHeight: CGFloat = 0

        for subview in subviews {
            let size = subview.sizeThatFits(.unspecified)
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
