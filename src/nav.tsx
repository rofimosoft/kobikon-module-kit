import { useCallback, useEffect, useRef, useState } from "react"

import { enterprises } from "./enterprises"
import { SharePanel } from "./share-panel"
import type { ModuleManifest } from "./types"

export function useWorkbenchMenu() {
  const timer = useRef<number | null>(null)
  const [hover, setHover] = useState(false)
  const [pinned, setPinned] = useState(false)
  const [narrow, setNarrow] = useState(() => window.matchMedia("(max-width: 800px)").matches)
  const open = narrow ? pinned : hover

  useEffect(() => {
    const query = window.matchMedia("(max-width: 800px)")
    const onChange = () => setNarrow(query.matches)
    query.addEventListener("change", onChange)
    return () => {
      query.removeEventListener("change", onChange)
      if (timer.current) window.clearTimeout(timer.current)
    }
  }, [])

  const show = useCallback(() => {
    if (timer.current) window.clearTimeout(timer.current)
    setHover(true)
  }, [])

  const hideSoon = useCallback(() => {
    if (timer.current) window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setHover(false), 140)
  }, [])

  const toggle = useCallback(() => setPinned((value) => !value), [])

  return { open, narrow, show, hideSoon, toggle }
}

export function WorkbenchNav({
  modules,
  activeModuleId,
  activeChannelId,
  enterpriseId,
  menu,
  onOpen,
  onEnterprise,
  notice,
  onPack,
  onDefinition,
  onImport,
  onCreate,
}: {
  modules: ModuleManifest[]
  activeModuleId?: string
  activeChannelId?: string
  enterpriseId: string
  menu: ReturnType<typeof useWorkbenchMenu>
  onOpen: (moduleId: string, channelId: string) => void
  onEnterprise: (id: string) => void
  notice: string
  onPack: () => void
  onDefinition: () => void
  onImport: (file: File) => void
  onCreate: (id: string, label: string) => string
}) {
  const { open, narrow, show, hideSoon, toggle } = menu
  const [enterpriseOpen, setEnterpriseOpen] = useState(false)
  const [openModuleId, setOpenModuleId] = useState<string | null>(null)
  const enterprise = enterprises.find((item) => item.id === enterpriseId) ?? enterprises[0]

  useEffect(() => {
    if (!open) {
      setEnterpriseOpen(false)
      setOpenModuleId(null)
    }
  }, [open])

  function choose(moduleId: string, channelId: string) {
    onOpen(moduleId, channelId)
    if (narrow) toggle()
  }

  return (
    <>
      {narrow && open ? (
        <button type="button" className="backdrop" aria-label="Menüyü kapat" onClick={toggle} />
      ) : null}
      <div
        className={open ? "nav-anchor neu-raised open" : "nav-anchor neu-raised"}
        onMouseEnter={narrow ? undefined : show}
        onMouseLeave={narrow ? undefined : hideSoon}
      >
        <nav className="nav" aria-label="Modüller">
          <div className={enterpriseOpen && open ? "nav-head pop-host" : "nav-head"}>
            <span className="rail-slot">
              <span className="mark neu-inset">K</span>
            </span>
            <button
              type="button"
              className="brand-btn"
              aria-expanded={enterpriseOpen}
              aria-label={`${enterprise.label} işletmesini değiştir`}
              onClick={() => setEnterpriseOpen((value) => !value)}
            >
              <span>{enterprise.label}</span>
              <Chevron open={enterpriseOpen} />
            </button>
            {narrow && open ? (
              <button
                type="button"
                className="icon-btn neu-press"
                aria-label="Menüyü kapat"
                onClick={toggle}
              >
                <PanelIcon />
              </button>
            ) : null}
            {open && enterpriseOpen ? (
              <div className="pop">
                {enterprises.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="nav-sub"
                    aria-current={item.id === enterpriseId ? "true" : undefined}
                    onClick={() => {
                      onEnterprise(item.id)
                      setEnterpriseOpen(false)
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <div className="nav-scroll">
            {modules.map((item) => {
              const opened = openModuleId === item.id
              const active = item.id === activeModuleId
              const first = item.groups[0]?.channels[0]
              return (
                <div key={item.id} className={opened && open ? "item-row front" : "item-row"}>
                  <div className="grow-row">
                    <button
                      type="button"
                      className="nav-row"
                      aria-current={!open && active ? "page" : undefined}
                      aria-label={open ? undefined : item.label}
                      onClick={() => {
                        if (first) choose(item.id, active && activeChannelId ? activeChannelId : first.id)
                        if (openModuleId !== item.id) setOpenModuleId(item.id)
                      }}
                    >
                      <span className="rail-slot">
                        <ModuleGlyph name={item.icon} />
                      </span>
                      <span>{item.label}</span>
                    </button>
                    <button
                      type="button"
                      className="icon-btn neu-press"
                      aria-expanded={opened}
                      aria-label={`${item.label} alt sayfaları`}
                      tabIndex={open ? 0 : -1}
                      onClick={() => setOpenModuleId(opened ? null : item.id)}
                    >
                      <Chevron open={opened} />
                    </button>
                  </div>
                  {open && opened ? (
                    <div className="sub">
                      {item.groups.map((group) => (
                        <div key={group.id}>
                          {item.groups.length > 1 ? <p className="nav-label">{group.label}</p> : null}
                          {group.channels.map((channel) => (
                            <button
                              key={channel.id}
                              type="button"
                              className="nav-sub"
                              aria-current={active && channel.id === activeChannelId ? "page" : undefined}
                              onClick={() => choose(item.id, channel.id)}
                            >
                              {channel.label}
                            </button>
                          ))}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
          {open ? (
            <SharePanel
              notice={notice}
              onPack={onPack}
              onDefinition={onDefinition}
              onImport={onImport}
              onCreate={onCreate}
            />
          ) : null}
        </nav>
      </div>
    </>
  )
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg className={open ? "chevron open" : "chevron"} width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

function PanelIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <rect x="2" y="2.5" width="12" height="11" rx="2" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path d="M6 2.5v11" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  )
}

function ModuleGlyph({ name }: { name?: string }) {
  const path =
    name === "wallet"
      ? "M3 5.5h10v7H3zM3 7h10M10 9.2h1.5"
      : name === "briefcase"
        ? "M6 4.5h4v1H6zM3 6.5h10v6H3z"
        : name === "warehouse"
          ? "M2.5 7L8 3.5 13.5 7V13H2.5z"
          : "M3 4.5h10v8H3z"
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <path d={path} fill="none" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  )
}
