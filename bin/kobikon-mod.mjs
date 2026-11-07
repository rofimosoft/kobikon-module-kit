#!/usr/bin/env node
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"

import { packModule } from "../shared/pack.mjs"
import { validateModule } from "../shared/validate.mjs"

const command = process.argv[2]

if (!command || command === "help" || command === "--help") {
  console.log(`Kobikon modül tezgahı

  node bin/kobikon-mod.mjs create <id> --label "Etiket"
  node bin/kobikon-mod.mjs check
  node bin/kobikon-mod.mjs pack <id>
  npm run dev

create  modules/<id>/module.json yazar.
check   bütün manifestleri sözleşmeye göre denetler.
pack    handoff/<id>/ içine çekirdeğe bırakılacak dosyaları üretir.
dev     önizlemeyi http://127.0.0.1:5174 adresinde açar.
`)
  process.exit(command ? 0 : 1)
}

if (command === "check") {
  const found = await loadModules()
  if (found.length === 0) {
    console.error("modules/ altında module.json yok.")
    process.exit(1)
  }
  let failed = false
  for (const item of found) {
    if (item.errors.length) {
      failed = true
      console.error(item.errors.join("\n"))
    } else {
      console.log(`tamam  ${item.manifest.id}`)
    }
  }
  process.exit(failed ? 1 : 0)
}

if (command === "create") {
  const id = process.argv[3]
  const label = flag("label")
  if (!id || !label) {
    console.error('Kullanım: node bin/kobikon-mod.mjs create <id> --label "Etiket"')
    process.exit(1)
  }
  const description = flag("description") || `${label} kayıtları`
  const channel = flag("channel") || "kayitlar"
  const noun = flag("noun") || label.toLocaleLowerCase("tr")
  const manifest = blankModule({ id, label, description, channel, noun })
  const errors = validateModule(manifest)
  if (errors.length) {
    console.error(errors.join("\n"))
    process.exit(1)
  }
  const dir = path.join(process.cwd(), "modules", id)
  const target = path.join(dir, "module.json")
  try {
    await readFile(target)
    console.error(`${target} zaten var.`)
    process.exit(1)
  } catch (error) {
    if (!error || error.code !== "ENOENT") throw error
  }
  await mkdir(dir, { recursive: true })
  await writeFile(target, `${JSON.stringify(manifest, null, 2)}\n`)
  console.log(target)
  process.exit(0)
}

if (command === "pack") {
  const id = process.argv[3]
  if (!id) {
    console.error("Kullanım: node bin/kobikon-mod.mjs pack <id>")
    process.exit(1)
  }
  const found = await loadModules()
  const item = found.find((entry) => entry.manifest?.id === id)
  if (!item) {
    console.error(`Modül yok: ${id}`)
    process.exit(1)
  }
  if (item.errors.length) {
    console.error(item.errors.join("\n"))
    process.exit(1)
  }
  const outDir = path.join(process.cwd(), "handoff", id)
  const files = await packModule(item.manifest, outDir)
  for (const name of files) console.log(path.join(outDir, name))
  process.exit(0)
}

console.error(`Bilinmeyen komut: ${command}`)
process.exit(1)

async function loadModules() {
  const dir = path.join(process.cwd(), "modules")
  let entries = []
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch (error) {
    if (error && error.code === "ENOENT") return []
    throw error
  }
  const found = []
  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const file = path.join(dir, entry.name, "module.json")
    try {
      const manifest = JSON.parse(await readFile(file, "utf8"))
      found.push({ manifest, errors: validateModule(manifest, file) })
    } catch (error) {
      if (error && error.code === "ENOENT") continue
      found.push({
        manifest: null,
        errors: [`${file}: ${error instanceof Error ? error.message : "okunamadı"}`],
      })
    }
  }
  return found
}

function blankModule({ id, label, description, channel, noun }) {
  return {
    id,
    label,
    description,
    searchPlaceholder: `${label} içinde ara`,
    tone: "bg-teal-700",
    icon: "mark",
    groups: [
      {
        id: "kayit",
        label: "Kayıt",
        channels: [{ id: channel, label: channel, resource: "records" }],
      },
    ],
    resources: {
      records: {
        noun,
        createLabel: `Yeni ${noun}`,
        titleField: "title",
        fields: [
          { name: "title", label: "Başlık", required: true },
          {
            name: "status",
            label: "Durum",
            kind: "select",
            required: true,
            defaultValue: "open",
            options: [
              { value: "open", label: "Açık" },
              { value: "done", label: "Bitti" },
            ],
          },
        ],
        seeds: [
          {
            enterpriseId: "kobikon",
            title: `${label} kaydı`,
            status: "open",
          },
          {
            enterpriseId: "ege",
            title: `${label} kaydı`,
            status: "open",
          },
          {
            enterpriseId: "marmara",
            title: `${label} kaydı`,
            status: "done",
          },
        ],
      },
    },
  }
}

function flag(name) {
  const index = process.argv.indexOf(`--${name}`)
  if (index === -1 || !process.argv[index + 1]) return ""
  return process.argv[index + 1]
}
