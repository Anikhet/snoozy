export interface TemplateGradient {
  light: readonly [string, string]
  dark: readonly [string, string]
}

export interface Template {
  id: string
  name: string
  description: string
  icon: string
  glyph: string
  gradient: TemplateGradient
  cardColorLight: string
  cardColorDark: string
}
