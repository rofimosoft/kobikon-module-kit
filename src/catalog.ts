import { validateModule } from "../shared/validate.mjs"
import type { ModuleManifest, Row } from "./types"

const loaded = import.meta.glob("../modules/*/module.json", {
  eager: true,
}) as Record<string, { default: ModuleManifest }>

export function loadModules() {
  const modules: ModuleManifest[] = []
  for (const [file, mod] of Object.entries(loaded)) {
    const errors = validateModule(mod.default, file)
    if (errors.length > 0) {
      throw new Error(errors.join("\n"))
    }
    modules.push(mod.default)
  }
  modules.sort((a, b) => a.label.localeCompare(b.label, "tr"))
  return modules
}

export function seedTables(modules: ModuleManifest[]) {
  const tables: Record<string, Row[]> = {}
  for (const manifest of modules) {
    for (const [name, resource] of Object.entries(manifest.resources)) {
      tables[tableKey(manifest.id, name)] = resource.seeds.map((seed, index) => ({
        id: `${manifest.id}-${name}-${index + 1}`,
        enterpriseId: String(seed.enterpriseId),
        values: Object.fromEntries(
          resource.fields.map((field) => [field.name, readSeed(field.kind, seed[field.name])])
        ),
      }))
    }
  }
  return tables
}

export function tableKey(moduleId: string, resource: string) {
  return `${moduleId}:${resource}`
}

function readSeed(kind: string | undefined, raw: string | number | undefined) {
  if (kind === "number") {
    return Number(String(raw ?? "0").replace(",", "."))
  }
  return String(raw ?? "")
}
