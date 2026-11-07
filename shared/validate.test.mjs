import assert from "node:assert/strict"
import test from "node:test"

import { validateModule } from "./validate.mjs"

test("örnek sözleşmeyi kabul eder", () => {
  assert.deepEqual(validateModule(sample()), [])
})

test("eksik işletmeyi reddeder", () => {
  const manifest = sample()
  manifest.resources.records.seeds = manifest.resources.records.seeds.filter(
    (seed) => seed.enterpriseId !== "marmara"
  )
  const errors = validateModule(manifest)
  assert.ok(errors.some((error) => error.includes("marmara")))
})

test("olmayan kaynağa giden kanalı reddeder", () => {
  const manifest = sample()
  manifest.groups[0].channels[0].resource = "missing"
  const errors = validateModule(manifest)
  assert.ok(errors.some((error) => error.includes("kaynağı yok")))
})

function sample() {
  return {
    id: "ornek",
    label: "Örnek",
    description: "Deneme",
    icon: "mark",
    groups: [
      {
        id: "kayit",
        label: "Kayıt",
        channels: [{ id: "notlar", label: "notlar", resource: "records" }],
      },
    ],
    resources: {
      records: {
        noun: "not",
        createLabel: "Yeni not",
        titleField: "title",
        fields: [{ name: "title", label: "Başlık", required: true }],
        seeds: [
          { enterpriseId: "kobikon", title: "A" },
          { enterpriseId: "ege", title: "B" },
          { enterpriseId: "marmara", title: "C" },
        ],
      },
    },
  }
}
