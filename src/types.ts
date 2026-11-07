export type FieldKind = "text" | "number" | "date" | "select"

export type FieldOption = {
  value: string
  label: string
}

export type FieldDef = {
  name: string
  label: string
  kind?: FieldKind
  required?: boolean
  options?: FieldOption[]
  defaultValue?: string
}

export type ResourceDef = {
  noun: string
  createLabel: string
  titleField: string
  fields: FieldDef[]
  columns?: string[]
  seeds: Record<string, string | number>[]
}

export type ChannelDef = {
  id: string
  label: string
  resource: string
}

export type GroupDef = {
  id: string
  label: string
  channels: ChannelDef[]
}

export type ModuleManifest = {
  id: string
  label: string
  description: string
  searchPlaceholder?: string
  tone?: string
  icon?: string
  groups: GroupDef[]
  resources: Record<string, ResourceDef>
}

export type Row = {
  id: string
  enterpriseId: string
  values: Record<string, string | number>
}
