export const ENTERPRISES = ["kobikon", "ege", "marmara"]

const ID = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/
const IDENT = /^[A-Za-z_][A-Za-z0-9_]*$/
const KINDS = new Set(["text", "number", "date", "select"])

export const ICONS = [
  "users",
  "package",
  "wallet",
  "warehouse",
  "briefcase",
  "cart",
  "truck",
  "handshake",
  "settings",
  "mark",
]

const ICON_SET = new Set(ICONS)

export function validateModule(manifest, file = "module.json") {
  const errors = []
  const fail = (message) => errors.push(`${file}: ${message}`)

  if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) {
    fail("kök bir nesne olmalı")
    return errors
  }

  if (!ID.test(manifest.id ?? "")) {
    fail("id küçük harf, rakam ve tire olmalı")
  }
  if (!text(manifest.label)) fail("label gerekli")
  if (!text(manifest.description)) fail("description gerekli")
  if (manifest.icon !== undefined && !ICON_SET.has(manifest.icon)) {
    fail(`icon şunlardan biri olmalı: ${ICONS.join(", ")}`)
  }
  if (manifest.tone !== undefined && !text(manifest.tone)) {
    fail("tone metin olmalı")
  }

  const resources = manifest.resources
  if (!resources || typeof resources !== "object" || Array.isArray(resources)) {
    fail("resources gerekli")
  }

  const resourceNames = new Set(Object.keys(resources ?? {}))
  for (const [name, resource] of Object.entries(resources ?? {})) {
    checkResource(name, resource, fail)
  }

  if (!Array.isArray(manifest.groups) || manifest.groups.length === 0) {
    fail("en az bir grup gerekli")
    return errors
  }

  const channelIds = new Set()
  for (const group of manifest.groups) {
    if (!group || typeof group !== "object") {
      fail("grup nesne olmalı")
      continue
    }
    if (!ID.test(group.id ?? "")) fail("grup id geçersiz")
    if (!text(group.label)) fail(`${group.id ?? "grup"} label gerekli`)
    if (!Array.isArray(group.channels) || group.channels.length === 0) {
      fail(`${group.id ?? "grup"} kanalı yok`)
      continue
    }
    for (const channel of group.channels) {
      if (!channel || typeof channel !== "object") {
        fail("kanal nesne olmalı")
        continue
      }
      if (!ID.test(channel.id ?? "")) fail("kanal id geçersiz")
      if (channelIds.has(channel.id)) fail(`kanal tekrar ediyor: ${channel.id}`)
      channelIds.add(channel.id)
      if (!text(channel.label)) fail(`${channel.id ?? "kanal"} label gerekli`)
      if (!resourceNames.has(channel.resource)) {
        fail(`${channel.id ?? "kanal"} kaynağı yok: ${channel.resource ?? ""}`)
      }
    }
  }

  return errors
}

function checkResource(name, resource, fail) {
  if (!IDENT.test(name)) fail(`kaynak adı tanımlayıcı olmalı: ${name}`)
  if (!resource || typeof resource !== "object" || Array.isArray(resource)) {
    fail(`${name} nesne olmalı`)
    return
  }
  if (!text(resource.noun)) fail(`${name}.noun gerekli`)
  if (!text(resource.createLabel)) fail(`${name}.createLabel gerekli`)
  if (!text(resource.titleField)) fail(`${name}.titleField gerekli`)

  const fields = Array.isArray(resource.fields) ? resource.fields : null
  if (!fields || fields.length === 0) {
    fail(`${name}.fields gerekli`)
    return
  }

  const fieldNames = new Set()
  for (const field of fields) {
    if (!field || typeof field !== "object" || !IDENT.test(field.name ?? "")) {
      fail(`${name} alanında geçersiz name`)
      continue
    }
    if (fieldNames.has(field.name)) fail(`${name}.${field.name} tekrar ediyor`)
    fieldNames.add(field.name)
    if (!text(field.label)) fail(`${name}.${field.name}.label gerekli`)
    const kind = field.kind ?? "text"
    if (!KINDS.has(kind)) fail(`${name}.${field.name}.kind geçersiz`)
    if (kind === "select") {
      if (!Array.isArray(field.options) || field.options.length === 0) {
        fail(`${name}.${field.name} seçenekleri gerekli`)
      } else {
        for (const option of field.options) {
          if (!text(option?.value) || !text(option?.label)) {
            fail(`${name}.${field.name} seçeneğinde value ve label gerekli`)
          }
        }
      }
    }
  }

  if (!fieldNames.has(resource.titleField)) {
    fail(`${name}.titleField bir alan adı olmalı`)
  }

  const columns = resource.columns ?? [...fieldNames]
  if (!Array.isArray(columns) || columns.length === 0) {
    fail(`${name}.columns boş olamaz`)
  } else {
    for (const column of columns) {
      if (!fieldNames.has(column)) fail(`${name} sütunu yok: ${column}`)
    }
  }

  if (!Array.isArray(resource.seeds)) {
    fail(`${name}.seeds dizi olmalı`)
    return
  }

  const seen = new Set()
  for (const seed of resource.seeds) {
    if (!seed || typeof seed !== "object" || Array.isArray(seed)) {
      fail(`${name} tohumu nesne olmalı`)
      continue
    }
    if (!ENTERPRISES.includes(seed.enterpriseId)) {
      fail(`${name} tohumunda enterpriseId kobikon, ege veya marmara olmalı`)
    } else {
      seen.add(seed.enterpriseId)
    }
    for (const field of fields) {
      if (!field?.name) continue
      if (field.required && !text(seed[field.name]) && seed[field.name] !== 0) {
        fail(`${name} tohumunda ${field.name} boş`)
      }
    }
  }

  for (const id of ENTERPRISES) {
    if (!seen.has(id)) fail(`${name} tohumu ${id} işletmesinde de olmalı`)
  }
}

function text(value) {
  return typeof value === "string" && value.trim().length > 0
}
