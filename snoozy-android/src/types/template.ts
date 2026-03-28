export type FieldType = 'color' | 'animal' | 'text'

export interface TemplateField {
  id: string
  label: string
  type: FieldType
}

export interface Template {
  id: string
  name: string
  description: string
  icon: string
  cardColorLight: string
  cardColorDark: string
  fields: TemplateField[]
}
