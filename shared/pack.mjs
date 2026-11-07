import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"

import { renderPackFiles } from "./render.mjs"

export async function packModule(manifest, outDir) {
  await mkdir(outDir, { recursive: true })
  const files = renderPackFiles(manifest)
  for (const [name, contents] of Object.entries(files)) {
    await writeFile(path.join(outDir, name), contents)
  }
  return Object.keys(files)
}
