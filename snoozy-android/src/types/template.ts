export type FieldType = 'color' | 'animal' | 'text'

export interface TemplateField {
  id: string
  label: string
  type: FieldType
}

/**
 * A single gradient tile — the two color stops. Light + dark stops keep the
 * card legible across themes without a separate asset.
 */
export interface TemplateGradient {
  light: readonly [string, string]
  dark: readonly [string, string]
}

export interface Template {
  id: string
  name: string
  description: string
  /** SF Symbol / Ionicon name — retained for accessibility fallbacks. */
  icon: string
  /** Editorial serif glyph shown in the template picker tile. */
  glyph: string
  gradient: TemplateGradient
  /** Legacy flat fallbacks. */
  cardColorLight: string
  cardColorDark: string
  fields: TemplateField[]
}
