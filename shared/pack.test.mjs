import assert from "node:assert/strict"
import { mkdtemp, readFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import test from "node:test"

import { packModule } from "./pack.mjs"

test("paket çekirdeğe bırakılacak sayfayı üretir", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "kobikon-mod-"))
  await packModule(
    {
      id: "gorevler",
      label: "Görevler",
      description: "İş takibi",
      searchPlaceholder: "Görev ara",
      tone: "bg-teal-700",
      icon: "briefcase",
      groups: [
        {
          id: "is",
          label: "İş",
          channels: [
            { id: "acik", label: "açık", resource: "tasks" },
            { id: "arsiv", label: "arşiv", resource: "tasks" },
          ],
        },
      ],
      resources: {
        tasks: {
          noun: "görev",
          createLabel: "Yeni görev",
          titleField: "title",
          fields: [
            { name: "title", label: "Başlık", required: true },
            { name: "amount", label: "Tutar", kind: "number" },
            {
              name: "status",
              label: "Durum",
              kind: "select",
              defaultValue: "open",
              options: [
                { value: "open", label: "Açık" },
                { value: "done", label: "Bitti" },
              ],
            },
          ],
          seeds: [
            { enterpriseId: "kobikon", title: "Tezgah", amount: "10", status: "open" },
            { enterpriseId: "ege", title: "Liste", amount: 4, status: "open" },
            { enterpriseId: "marmara", title: "Kat", amount: "0", status: "done" },
          ],
        },
      },
    },
    dir
  )

  const page = await readFile(path.join(dir, "page.tsx"), "utf8")
  const data = await readFile(path.join(dir, "data.ts"), "utf8")
  const nav = await readFile(path.join(dir, "navigation.snippet.ts"), "utf8")
  assert.match(page, /export function GorevlerPage/)
  assert.match(page, /channelId === "acik" \|\| channelId === "arsiv"/)
  assert.match(page, /useWorkspace\(\)/)
  assert.match(page, /tasksStatusLabels\[row\.status\]/)
  assert.match(data, /enterpriseId: "marmara"/)
  assert.match(data, /amount: 10/)
  assert.match(nav, /icon: "briefcase"/)
  assert.doesNotMatch(nav, /resource:/)
})
