import assert from "node:assert/strict"
import { execFile } from "node:child_process"
import { mkdtemp, readFile, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import test from "node:test"
import { promisify } from "node:util"

import { renderPackFiles } from "./render.mjs"
import { zipStore } from "./zip.mjs"

const exec = promisify(execFile)

test("indirilen paket zip olarak açılır", async () => {
  const files = renderPackFiles({
    id: "gorevler",
    label: "Görevler",
    description: "İş takibi",
    icon: "briefcase",
    groups: [
      {
        id: "is",
        label: "İş",
        channels: [{ id: "acik", label: "açık", resource: "tasks" }],
      },
    ],
    resources: {
      tasks: {
        noun: "görev",
        createLabel: "Yeni görev",
        titleField: "title",
        fields: [{ name: "title", label: "Başlık", required: true }],
        seeds: [
          { enterpriseId: "kobikon", title: "Tezgah" },
          { enterpriseId: "ege", title: "Liste" },
          { enterpriseId: "marmara", title: "Kat" },
        ],
      },
    },
  })
  const dir = await mkdtemp(path.join(tmpdir(), "kobikon-zip-"))
  const archive = path.join(dir, "paket.zip")
  const bytes = new Uint8Array(await zipStore(files).arrayBuffer())
  await writeFile(archive, bytes)
  await exec("python3", ["-m", "zipfile", "-t", archive])
  await exec("python3", ["-m", "zipfile", "-e", archive, dir])
  const guide = await readFile(path.join(dir, "NASIL.md"), "utf8")
  assert.match(guide, /Görevler/)
  assert.match(await readFile(path.join(dir, "page.tsx"), "utf8"), /GorevlerPage/)
})
