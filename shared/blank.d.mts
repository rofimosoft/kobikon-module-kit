export function blankModule(input: {
  id: string
  label: string
  description?: string
  channel?: string
  noun?: string
}): {
  id: string
  label: string
  description: string
  groups: { channels: { id: string }[] }[]
}
