import { useEffect, useRef, useState, type FormEvent } from "react"

import type { FieldDef, ResourceDef, Row } from "./types"

export function ResourceView({
  resource,
  rows,
  query,
  onCreate,
}: {
  resource: ResourceDef
  rows: Row[]
  query: string
  onCreate: (values: Record<string, string>) => void
}) {
  const columns = resource.columns ?? resource.fields.map((field) => field.name)
  const fields = columns.map(
    (name) => resource.fields.find((field) => field.name === name) ?? resource.fields[0]
  )
  const needle = query.trim().toLocaleLowerCase("tr")
  const visible = rows.filter((row) => {
    if (!needle) return true
    return resource.fields.some((field) =>
      display(field, row.values[field.name]).toLocaleLowerCase("tr").includes(needle)
    )
  })
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const selected = visible.find((row) => row.id === selectedId) ?? null

  return (
    <section className="stage">
      <div className="stage-bar">
        <p>
          {visible.length} {resource.noun} · örnek veri, bu oturumda tutulur
        </p>
        <button type="button" className="primary" onClick={() => setCreating(true)}>
          {resource.createLabel}
        </button>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {fields.map((field) => (
                <th key={field.name} className={field.kind === "number" ? "num" : undefined}>
                  {field.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => (
              <tr
                key={row.id}
                data-selected={row.id === selected?.id ? "true" : undefined}
                onClick={() => setSelectedId(row.id)}
              >
                {fields.map((field) => (
                  <td key={field.name} className={field.kind === "number" ? "num" : undefined}>
                    {display(field, row.values[field.name])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {visible.length === 0 ? <p className="muted">Bu görünümde kayıt yok.</p> : null}
      {selected ? (
        <aside className="detail">
          <div className="detail-head">
            <h2>{display(titleField(resource), selected.values[resource.titleField])}</h2>
            <button type="button" onClick={() => setSelectedId(null)}>
              Kapat
            </button>
          </div>
          <p className="muted">{resource.noun}</p>
          {resource.fields.map((field) => (
            <div key={field.name} className="detail-line">
              <span>{field.label}</span>
              <strong>{display(field, selected.values[field.name])}</strong>
            </div>
          ))}
        </aside>
      ) : null}
      <CreateDialog
        open={creating}
        resource={resource}
        onOpenChange={setCreating}
        onCreate={onCreate}
      />
    </section>
  )
}

function CreateDialog({
  open,
  resource,
  onOpenChange,
  onCreate,
}: {
  open: boolean
  resource: ResourceDef
  onOpenChange: (open: boolean) => void
  onCreate: (values: Record<string, string>) => void
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const values: Record<string, string> = {}
    for (const field of resource.fields) {
      const raw = String(form.get(field.name) ?? "").trim()
      if (field.required && !raw) {
        setError(`${field.label} gerekli.`)
        return
      }
      if (field.kind === "number" && raw && !Number.isFinite(Number(raw.replace(",", ".")))) {
        setError(`${field.label} sayı olmalı.`)
        return
      }
      values[field.name] = raw
    }
    onCreate(values)
    setError("")
    onOpenChange(false)
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={() => {
        setError("")
        onOpenChange(false)
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current) onOpenChange(false)
      }}
    >
      {open ? (
        <form onSubmit={handleSubmit}>
          <h2>{resource.createLabel}</h2>
          <p className="muted">Kayıt seçili işletmeye eklenir.</p>
          <div className="fields">
            {resource.fields.map((field) => (
              <label key={field.name}>
                <span>{field.label}</span>
                {field.kind === "select" ? (
                  <select
                    name={field.name}
                    defaultValue={field.defaultValue ?? field.options?.[0]?.value}
                  >
                    {field.options?.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    name={field.name}
                    type={field.kind === "date" ? "date" : "text"}
                    inputMode={field.kind === "number" ? "decimal" : undefined}
                    defaultValue={field.defaultValue}
                  />
                )}
              </label>
            ))}
          </div>
          {error ? <p className="error">{error}</p> : null}
          <div className="dialog-actions">
            <button type="button" onClick={() => onOpenChange(false)}>
              Vazgeç
            </button>
            <button type="submit" className="primary">
              Kaydet
            </button>
          </div>
        </form>
      ) : null}
    </dialog>
  )
}

function titleField(resource: ResourceDef) {
  return (
    resource.fields.find((field) => field.name === resource.titleField) ?? resource.fields[0]
  )
}

function display(field: FieldDef, value: string | number | undefined) {
  if (field.kind === "select") {
    return field.options?.find((option) => option.value === String(value ?? ""))?.label ?? ""
  }
  if (field.kind === "number") {
    return new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 2 }).format(
      Number(value ?? 0)
    )
  }
  return String(value ?? "")
}
