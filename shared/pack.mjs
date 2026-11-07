import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"

import { ICONS } from "./validate.mjs"

const ICON_SET = new Set(ICONS)

export async function packModule(manifest, outDir) {
  await mkdir(outDir, { recursive: true })
  const files = {
    "data.ts": renderData(manifest),
    "page.tsx": renderPage(manifest),
    "navigation.snippet.ts": renderNavigation(manifest),
    "NASIL.md": renderGuide(manifest),
  }
  for (const [name, contents] of Object.entries(files)) {
    await writeFile(path.join(outDir, name), contents)
  }
  return Object.keys(files)
}

function renderData(manifest) {
  const blocks = []
  for (const [name, resource] of Object.entries(manifest.resources)) {
    const typeName = rowType(name)
    const lines = [
      `export type ${typeName} = {`,
      "  id: string",
      "  enterpriseId: string",
    ]
    for (const field of resource.fields) {
      lines.push(`  ${field.name}: ${field.kind === "number" ? "number" : "string"}`)
    }
    lines.push("}", "")
    for (const field of resource.fields) {
      if ((field.kind ?? "text") !== "select") continue
      lines.push(`export const ${labelMap(name, field.name)}: Record<string, string> = {`)
      for (const option of field.options ?? []) {
        lines.push(`  ${quote(option.value)}: ${quote(option.label)},`)
      }
      lines.push("}", "")
    }
    lines.push(`export const ${name}Seed: ${typeName}[] = [`)
    resource.seeds.forEach((seed, index) => {
      lines.push("  {")
      lines.push(`    id: ${quote(`${manifest.id}-${name}-${index + 1}`)},`)
      lines.push(`    enterpriseId: ${quote(seed.enterpriseId)},`)
      for (const field of resource.fields) {
        lines.push(`    ${field.name}: ${literal(field, seed[field.name])},`)
      }
      lines.push("  },")
    })
    lines.push("]", "")
    blocks.push(lines.join("\n"))
  }
  return `${blocks.join("\n")}`
}

function renderPage(manifest) {
  const component = `${pascal(manifest.id)}Page`
  const resources = Object.entries(manifest.resources)
  const hasNumber = resources.some(([, resource]) =>
    resource.fields.some((field) => field.kind === "number")
  )
  const imports = resources.flatMap(([name, resource]) => {
    const names = [`${name}Seed`, `type ${rowType(name)}`]
    for (const field of resource.fields) {
      if (field.kind === "select") names.push(labelMap(name, field.name))
    }
    return names
  })

  const states = resources
    .map(([name]) => {
      const state = stateName(name)
      return `  const [${state}, set${pascal(name)}] = useState(${name}Seed)`
    })
    .join("\n")

  const visible = resources
    .map(([name]) => {
      const state = stateName(name)
      return `  const ${state}Visible = useMemo(
    () => ${state}.filter((row) => row.enterpriseId === enterpriseId),
    [${state}, enterpriseId]
  )`
    })
    .join("\n")

  const branches = channelBranches(manifest)
    .map(({ channelIds, name, resource }) => {
      const condition = channelIds.map((id) => `channelId === ${quote(id)}`).join(" || ")
      return `  if (${condition}) {
    return (
      <${pascal(name)}
        rows={${stateName(name)}Visible}
        onCreate={(values) =>
          set${pascal(name)}((current) => [
            {
              id: crypto.randomUUID(),
              enterpriseId,
${resource.fields
  .map((field) => `              ${field.name}: ${readValue(field)},`)
  .join("\n")}
            },
            ...current,
          ])
        }
      />
    )
  }`
    })
    .join("\n")

  const views = resources
    .map(([name, resource]) => renderView(name, resource))
    .join("\n\n")

  return `import { useMemo, useState } from "react"

import { useWorkspace } from "@/components/workspace-provider"
import {
  DetailLine,
  ResourcePage,
  type ResourceField,
} from "@/modules/resource-page"
import {
  ${imports.join(",\n  ")},
} from "@/modules/${manifest.id}/data"

export function ${component}({ channelId }: { channelId: string }) {
  const { enterpriseId } = useWorkspace()
${states}
${visible}

${branches}
  return null
}

${views}
${
  hasNumber
    ? `
function numberValue(raw: string) {
  return Number(raw.replace(",", "."))
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 2 }).format(
    value
  )
}
`
    : ""
}
`
}

function renderView(name, resource) {
  const columns = resource.columns ?? resource.fields.map((field) => field.name)
  const columnCode = columns
    .map((column) => {
      const field = resource.fields.find((item) => item.name === column)
      const align = field?.kind === "number" ? `\n        align: "right",` : ""
      return `      {
        header: ${quote(field.label)},${align}
        cell: (row) => ${cell(name, field)},
        search: (row) => ${search(name, field)},
      },`
    })
    .join("\n")

  const detail = resource.fields
    .map((field) => {
      return `          <DetailLine label=${quote(field.label)} value={${valueExpr(name, field)}} />`
    })
    .join("\n")

  return `const ${name}Fields: ResourceField[] = ${JSON.stringify(resource.fields, null, 2)}

function ${pascal(name)}({
  rows,
  onCreate,
}: {
  rows: ${rowType(name)}[]
  onCreate: (values: Record<string, string>) => void
}) {
  return (
    <ResourcePage
      noun=${quote(resource.noun)}
      rows={rows}
      createLabel=${quote(resource.createLabel)}
      fields={${name}Fields}
      onCreate={onCreate}
      columns={[
${columnCode}
      ]}
      detailTitle={(row) => String(row.${resource.titleField})}
      detailDescription={() => ${quote(resource.noun)}}
      detail={(row) => (
        <>
${detail}
        </>
      )}
    />
  )
}`
}

function channelBranches(manifest) {
  const grouped = new Map()
  for (const group of manifest.groups) {
    for (const channel of group.channels) {
      const current = grouped.get(channel.resource) ?? []
      current.push(channel.id)
      grouped.set(channel.resource, current)
    }
  }
  return [...grouped.entries()].map(([name, channelIds]) => ({
    name,
    channelIds,
    resource: manifest.resources[name],
  }))
}

function renderNavigation(manifest) {
  const icon = ICON_SET.has(manifest.icon) ? manifest.icon : "mark"
  const groups = manifest.groups.map((group) => ({
    id: group.id,
    label: group.label,
    channels: group.channels.map((channel) => ({
      id: channel.id,
      label: channel.label,
    })),
  }))
  return `export const ${camel(manifest.id)}Module = {
  id: ${quote(manifest.id)},
  label: ${quote(manifest.label)},
  description: ${quote(manifest.description)},
  status: "live" as const,
  searchPlaceholder: ${quote(manifest.searchPlaceholder || `${manifest.label} içinde ara`)},
  tone: ${quote(manifest.tone || "bg-teal-700")},
  icon: ${quote(icon)} as const,
  groups: ${JSON.stringify(groups, null, 2)},
}
`
}

function renderGuide(manifest) {
  const component = `${pascal(manifest.id)}Page`
  return `# ${manifest.label} modülünü çekirdeğe bırakma

Bu klasör, Kobikon çekirdek deposu paylaşılmadan hazırlandı. Dosyaları çekirdek ekibine verin.

1. \`data.ts\` ve \`page.tsx\` dosyalarını \`frontend/src/modules/${manifest.id}/\` altına koyun.
2. \`navigation.snippet.ts\` içindeki nesneyi \`frontend/src/data/navigation.ts\` dosyasındaki \`modules\` dizisine ve \`ModuleId\` birliğine ekleyin. \`id\` kalıcıdır; adres \`/${manifest.id}/${manifest.groups[0].channels[0].id}\` olur.
3. \`frontend/src/modules/registry.tsx\` içinde \`${component}\` bileşenini \`${manifest.id}\` anahtarına bağlayın.
4. İkon haritasında \`${manifest.icon || "mark"}\` yoksa \`server-rail.tsx\` içine ekleyin.

Sayfa kendi kayıtlarını tutar ve seçili işletmeyi \`useWorkspace().enterpriseId\` ile süzer. Servis yazılana kadar \`fetch\` eklenmez. Kayıtlar sayfa yenilenince başlangıç verisine döner.
`
}

function cell(name, field) {
  if (field.kind === "select") {
    return `${labelMap(name, field.name)}[row.${field.name}]`
  }
  if (field.kind === "number") return `formatNumber(row.${field.name})`
  if (field.name) return `row.${field.name}`
  return `row.${field.name}`
}

function search(name, field) {
  if (field.kind === "select") {
    return `${labelMap(name, field.name)}[row.${field.name}]`
  }
  return `row.${field.name}`
}

function valueExpr(name, field) {
  if (field.kind === "select") {
    return `${labelMap(name, field.name)}[row.${field.name}]`
  }
  if (field.kind === "number") return `formatNumber(row.${field.name})`
  return `row.${field.name}`
}

function readValue(field) {
  if (field.kind === "number") return `numberValue(values.${field.name} ?? "")`
  if (field.defaultValue) {
    return `values.${field.name} || ${quote(field.defaultValue)}`
  }
  return `values.${field.name} ?? ""`
}

function literal(field, value) {
  if (field.kind === "number") {
    return String(Number(String(value ?? "0").replace(",", ".")))
  }
  return quote(value == null ? "" : String(value))
}

function labelMap(resourceName, fieldName) {
  return `${resourceName}${pascal(fieldName)}Labels`
}

function rowType(resourceName) {
  return `${pascal(resourceName)}Row`
}

function stateName(resourceName) {
  return camel(resourceName)
}

function pascal(value) {
  return String(value)
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("")
}

function camel(value) {
  const [first, ...rest] = pascal(value)
  return `${first.toLowerCase()}${rest.join("")}`
}

function quote(value) {
  return JSON.stringify(value ?? "")
}
