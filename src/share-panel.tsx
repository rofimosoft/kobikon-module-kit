import { useRef, useState, type FormEvent } from "react"

export function SharePanel({
  notice,
  onPack,
  onDefinition,
  onImport,
  onCreate,
}: {
  notice: string
  onPack: () => void
  onDefinition: () => void
  onImport: (file: File) => void
  onCreate: (id: string, label: string) => string
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState("")

  function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const message = onCreate(
      String(form.get("id") ?? "").trim(),
      String(form.get("label") ?? "").trim()
    )
    if (message) {
      setError(message)
      return
    }
    setError("")
    setCreating(false)
  }

  return (
    <div className="share">
      <p>Modülü deneyin, sonra paketi indirin.</p>
      <button type="button" className="primary" onClick={onPack}>
        Paketi indir
      </button>
      <button type="button" onClick={onDefinition}>
        Tanımı indir
      </button>
      <button type="button" onClick={() => fileRef.current?.click()}>
        Modül yükle
      </button>
      <button type="button" onClick={() => setCreating(true)}>
        Yeni modül
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0]
          event.target.value = ""
          if (file) onImport(file)
        }}
      />
      {notice ? <p className="notice">{notice}</p> : null}
      {creating ? (
        <form className="create-form" onSubmit={handleCreate}>
          <label>
            <span>Kimlik</span>
            <input name="id" placeholder="gorevler" autoFocus />
          </label>
          <label>
            <span>Etiket</span>
            <input name="label" placeholder="Görevler" />
          </label>
          {error ? <p className="error">{error}</p> : null}
          <div className="dialog-actions">
            <button type="button" onClick={() => setCreating(false)}>
              Vazgeç
            </button>
            <button type="submit" className="primary">
              Oluştur
            </button>
          </div>
        </form>
      ) : null}
    </div>
  )
}
