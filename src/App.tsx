import { useEffect, useState } from "react"

import { loadModules, seedTables, tableKey } from "./catalog"
import { enterprises } from "./enterprises"
import { ResourceView } from "./resource-view"
import type { ModuleManifest, Row } from "./types"

const modules = loadModules()
const tones: Record<string, string> = {
  "bg-sky-600": "#0284c7",
  "bg-amber-600": "#d97706",
  "bg-orange-600": "#ea580c",
  "bg-teal-700": "#0f766e",
  "bg-rose-600": "#e11d48",
  "bg-emerald-600": "#059669",
  "bg-violet-600": "#7c3aed",
  "bg-brand": "#0f766e",
}

export function App() {
  const [tables, setTables] = useState(() => seedTables(modules))
  const [enterpriseId, setEnterpriseId] = useState(enterprises[0].id)
  const [query, setQuery] = useState("")
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [selection, setSelection] = useState(() => readSelection())

  useEffect(() => {
    if (modules.length === 0) return
    if (!window.location.hash) {
      const channel = channelsOf(modules[0])[0]
      window.history.replaceState(null, "", `#/${modules[0].id}/${channel.id}`)
    }
    const apply = () => setSelection(readSelection())
    apply()
    window.addEventListener("hashchange", apply)
    return () => window.removeEventListener("hashchange", apply)
  }, [])

  const manifest = selection.module
  const channel = selection.channel
  const resource = manifest && channel ? manifest.resources[channel.resource] : undefined

  useEffect(() => {
    if (!manifest || !channel) return
    document.title = `${channel.label} · ${manifest.label} · Kobikon tezgah`
  }, [channel, manifest])

  useEffect(() => {
    setQuery("")
  }, [manifest?.id, channel?.id])

  function openChannel(moduleId: string, channelId: string) {
    window.location.hash = `#/${moduleId}/${channelId}`
    setSidebarOpen(false)
  }

  function addRow(values: Record<string, string>) {
    if (!manifest || !channel || !resource) return
    const key = tableKey(manifest.id, channel.resource)
    const row: Row = {
      id: crypto.randomUUID(),
      enterpriseId,
      values: Object.fromEntries(
        resource.fields.map((field) => {
          const raw = values[field.name] ?? ""
          if (field.kind === "number") {
            return [field.name, Number(raw.replace(",", ".")) || 0]
          }
          return [field.name, raw || field.defaultValue || ""]
        })
      ),
    }
    setTables((current) => ({ ...current, [key]: [row, ...(current[key] ?? [])] }))
  }

  if (!manifest || !channel || !resource) {
    return (
      <main className="empty">
        <h1>Modül yok</h1>
        <p>İlk modülü `node bin/kobikon-mod.mjs create gorevler --label "Görevler"` ile ekleyin.</p>
      </main>
    )
  }

  const rows = (tables[tableKey(manifest.id, channel.resource)] ?? []).filter(
    (row) => row.enterpriseId === enterpriseId
  )

  return (
    <div className="shell">
      <nav className="rail" aria-label="Modüller">
        {modules.map((item) => (
          <button
            key={item.id}
            type="button"
            className="rail-button"
            aria-current={item.id === manifest.id ? "page" : undefined}
            title={item.label}
            style={{ background: tones[item.tone ?? ""] ?? "#0f766e" }}
            onClick={() => openChannel(item.id, channelsOf(item)[0].id)}
          >
            {item.label.slice(0, 1)}
          </button>
        ))}
      </nav>
      <aside className={sidebarOpen ? "sidebar open" : "sidebar"}>
        <label className="enterprise">
          <span>İşletme</span>
          <select
            value={enterpriseId}
            onChange={(event) => setEnterpriseId(event.target.value)}
          >
            {enterprises.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <p className="module-copy">{manifest.description}</p>
        {manifest.groups.map((group) => (
          <div key={group.id} className="group">
            <p>{group.label}</p>
            {group.channels.map((item) => (
              <button
                key={item.id}
                type="button"
                className="channel"
                aria-current={item.id === channel.id ? "page" : undefined}
                onClick={() => openChannel(manifest.id, item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
        ))}
      </aside>
      <div className="main">
        <header className="topbar">
          <button
            type="button"
            className="menu"
            aria-expanded={sidebarOpen}
            onClick={() => setSidebarOpen((open) => !open)}
          >
            Kanallar
          </button>
          <h1>{channel.label}</h1>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={manifest.searchPlaceholder || `${manifest.label} içinde ara`}
            aria-label={manifest.searchPlaceholder || `${manifest.label} içinde ara`}
          />
        </header>
        <ResourceView resource={resource} rows={rows} query={query} onCreate={addRow} />
      </div>
    </div>
  )
}

function channelsOf(manifest: ModuleManifest) {
  return manifest.groups.flatMap((group) => group.channels)
}

function readSelection() {
  const [moduleId, channelId] = window.location.hash.replace(/^#\/?/, "").split("/")
  const manifest = modules.find((item) => item.id === moduleId) ?? modules[0]
  if (!manifest) return { module: undefined, channel: undefined }
  const channels = channelsOf(manifest)
  const channel = channels.find((item) => item.id === channelId) ?? channels[0]
  return { module: manifest, channel }
}
