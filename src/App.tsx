import { useEffect, useRef, useState } from "react"

import { blankModule } from "../shared/blank.mjs"
import { renderPackFiles } from "../shared/render.mjs"
import { validateModule } from "../shared/validate.mjs"
import { zipStore } from "../shared/zip.mjs"
import { loadModules, seedTables, tableKey } from "./catalog"
import { enterprises } from "./enterprises"
import { ResourceView } from "./resource-view"
import { SharePanel } from "./share-panel"
import { WorkbenchNav, useWorkbenchMenu } from "./nav"
import type { ModuleManifest, Row } from "./types"

const bundled = loadModules()

export function App() {
  const [modules, setModules] = useState(bundled)
  const modulesRef = useRef(modules)
  const [tables, setTables] = useState(() => seedTables(bundled))
  const [enterpriseId, setEnterpriseId] = useState(enterprises[0].id)
  const [query, setQuery] = useState("")
  const [selection, setSelection] = useState(() => readSelection(bundled))
  const [notice, setNotice] = useState("")
  const menu = useWorkbenchMenu()

  useEffect(() => {
    if (modulesRef.current.length === 0) return
    if (!window.location.hash) {
      const first = modulesRef.current[0]
      const channel = channelsOf(first)[0]
      window.history.replaceState(null, "", `#/${first.id}/${channel.id}`)
    }
    const apply = () => setSelection(readSelection(modulesRef.current))
    apply()
    window.addEventListener("hashchange", apply)
    return () => window.removeEventListener("hashchange", apply)
  }, [])

  const manifest =
    modules.find((item) => item.id === selection.module?.id) ?? selection.module
  const channel = manifest
    ? channelsOf(manifest).find((item) => item.id === selection.channel?.id) ??
      channelsOf(manifest)[0]
    : undefined
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
  }

  function adopt(nextManifest: ModuleManifest) {
    const next = [...modules.filter((item) => item.id !== nextManifest.id), nextManifest].sort(
      (a, b) => a.label.localeCompare(b.label, "tr")
    )
    modulesRef.current = next
    setModules(next)
    setTables((current) => ({ ...current, ...seedTables([nextManifest]) }))
    const first = channelsOf(nextManifest)[0]
    openChannel(nextManifest.id, first.id)
  }

  function liveManifest(source: ModuleManifest) {
    return {
      ...source,
      resources: Object.fromEntries(
        Object.entries(source.resources).map(([name, item]) => {
          const rows = tables[tableKey(source.id, name)] ?? []
          const seeds = [...rows].reverse().map((row) => ({
            enterpriseId: row.enterpriseId,
            ...row.values,
          }))
          return [name, { ...item, seeds: seeds.length > 0 ? seeds : item.seeds }]
        })
      ),
    }
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

  function downloadPack() {
    if (!manifest) return
    const live = liveManifest(manifest)
    const errors = validateModule(live, "module.json")
    if (errors.length > 0) {
      setNotice(errors[0])
      return
    }
    saveFile(zipStore(renderPackFiles(live)), `${manifest.id}-paket.zip`)
    setNotice("Paket indi.")
  }

  function downloadDefinition() {
    if (!manifest) return
    const live = liveManifest(manifest)
    saveFile(
      new Blob([`${JSON.stringify(live, null, 2)}\n`], { type: "application/json" }),
      `${manifest.id}.module.json`
    )
    setNotice("Tanım indi. Düzenleyip yeniden yükleyebilirsiniz.")
  }

  async function importModule(file: File) {
    let parsed: unknown
    try {
      parsed = JSON.parse(await file.text())
    } catch {
      setNotice("Dosya JSON değil.")
      return
    }
    const errors = validateModule(parsed, file.name)
    if (errors.length > 0) {
      setNotice(errors[0])
      return
    }
    adopt(parsed as ModuleManifest)
    setNotice("Modül yüklendi.")
  }

  function createModule(id: string, label: string) {
    if (!id || !label) return "Kimlik ve etiket gerekli."
    if (modules.some((item) => item.id === id)) return "Bu kimlik zaten var."
    const draft = blankModule({ id, label })
    const errors = validateModule(draft, "module.json")
    if (errors.length > 0) return errors[0].replace(/^module\.json:\s*/, "")
    adopt(draft as ModuleManifest)
    setNotice("Modül hazır. Kayıt ekleyip paketi indirin.")
    return ""
  }

  if (!manifest || !channel || !resource) {
    return (
      <main className="empty">
        <h1>Modül yok</h1>
        <SharePanel
          notice={notice}
          onPack={downloadPack}
          onDefinition={downloadDefinition}
          onImport={(file) => void importModule(file)}
          onCreate={createModule}
        />
      </main>
    )
  }

  const rows = (tables[tableKey(manifest.id, channel.resource)] ?? []).filter(
    (row) => row.enterpriseId === enterpriseId
  )

  return (
    <div className="shell">
      <WorkbenchNav
        modules={modules}
        activeModuleId={manifest.id}
        activeChannelId={channel.id}
        enterpriseId={enterpriseId}
        menu={menu}
        onOpen={openChannel}
        onEnterprise={setEnterpriseId}
        notice={notice}
        onPack={downloadPack}
        onDefinition={downloadDefinition}
        onImport={(file) => void importModule(file)}
        onCreate={createModule}
      />
      <div className="main neu-raised">
        <header className="topbar">
          <ChannelMenu
            label={channel.label}
            channels={channelsOf(manifest)}
            activeId={channel.id}
            onOpen={(channelId) => openChannel(manifest.id, channelId)}
          />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={manifest.searchPlaceholder || `${manifest.label} içinde ara`}
            aria-label={manifest.searchPlaceholder || `${manifest.label} içinde ara`}
          />
          <button type="button" className="primary neu-press" onClick={downloadPack}>
            Paketi indir
          </button>
        </header>
        <ResourceView resource={resource} rows={rows} query={query} onCreate={addRow} />
      </div>
    </div>
  )
}

function ChannelMenu({
  label,
  channels,
  activeId,
  onOpen,
}: {
  label: string
  channels: { id: string; label: string }[]
  activeId: string
  onOpen: (channelId: string) => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="channel-menu">
      <button
        type="button"
        className="channel-trigger"
        aria-expanded={open}
        aria-label={`${label} alt sayfaları`}
        onClick={() => setOpen((value) => !value)}
      >
        <span>{label}</span>
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
          <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>
      {open ? (
        <div className="channel-pop neu-raised">
          {channels.map((item) => (
            <button
              key={item.id}
              type="button"
              className="nav-sub"
              aria-current={item.id === activeId ? "page" : undefined}
              onClick={() => {
                onOpen(item.id)
                setOpen(false)
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

function channelsOf(manifest: ModuleManifest) {
  return manifest.groups.flatMap((group) => group.channels)
}

function readSelection(list: ModuleManifest[]) {
  const [moduleId, channelId] = window.location.hash.replace(/^#\/?/, "").split("/")
  const manifest = list.find((item) => item.id === moduleId) ?? list[0]
  if (!manifest) return { module: undefined, channel: undefined }
  const channels = channelsOf(manifest)
  const channel = channels.find((item) => item.id === channelId) ?? channels[0]
  return { module: manifest, channel }
}

function saveFile(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = name
  link.click()
  URL.revokeObjectURL(url)
}
