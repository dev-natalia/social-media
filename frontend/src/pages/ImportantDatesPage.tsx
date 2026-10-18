import { useEffect, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api, ApiError } from '../api/client'
import type { ClientSummary, ImportantDate } from '../api/types'
import { parseISODate } from '../lib/dates'

function formatDate(iso: string, recurring: boolean): string {
  const d = parseISODate(iso)
  const dm = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
  return recurring ? dm : `${dm}/${d.getFullYear()}`
}

function DateSection({ title, clientId }: { title: string; clientId: number | null }) {
  const [items, setItems] = useState<ImportantDate[] | null>(null)
  const [name, setName] = useState('')
  const [date, setDate] = useState('')
  const [recurring, setRecurring] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setItems(null)
    api<ImportantDate[]>(`/api/important-dates?client_id=${clientId ?? 'general'}`)
      .then(setItems)
      .catch(() => setError('Não foi possível carregar.'))
  }, [clientId])

  async function attempt(action: () => Promise<void>) {
    setError('')
    try {
      await action()
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : 'Não foi possível salvar.')
    }
  }

  function add(e: FormEvent) {
    e.preventDefault()
    attempt(async () => {
      const item = await api<ImportantDate>('/api/important-dates', {
        method: 'POST',
        json: { date, name: name.trim(), client_id: clientId, recurring_yearly: recurring },
      })
      setItems((list) => [...(list ?? []), item].sort((a, b) => a.date.localeCompare(b.date)))
      setName('')
      setDate('')
      setRecurring(false)
    })
  }

  return (
    <section aria-label={title} className="date-section">
      <h2>{title}</h2>
      {error && <p className="error">{error}</p>}
      {items === null ? (
        <p className="muted">Carregando…</p>
      ) : items.length === 0 ? (
        <p className="muted small">Nenhuma data cadastrada.</p>
      ) : (
        <ul className="date-list">
          {items.map((item) => (
            <li key={item.id}>
              <span className="date-when">{formatDate(item.date, item.recurring_yearly)}</span>
              <span className="date-name">{item.name}</span>
              <label className="check small">
                <input
                  type="checkbox"
                  checked={item.recurring_yearly}
                  onChange={(e) =>
                    attempt(async () => {
                      const saved = await api<ImportantDate>(`/api/important-dates/${item.id}`, {
                        method: 'PATCH',
                        json: { recurring_yearly: e.target.checked },
                      })
                      setItems((list) => list!.map((i) => (i.id === saved.id ? saved : i)))
                    })
                  }
                />
                Todo ano
              </label>
              <button
                className="icon-btn"
                aria-label={`Excluir ${item.name}`}
                onClick={() =>
                  attempt(async () => {
                    await api(`/api/important-dates/${item.id}`, { method: 'DELETE' })
                    setItems((list) => list!.filter((i) => i.id !== item.id))
                  })
                }
              >
                🗑
              </button>
            </li>
          ))}
        </ul>
      )}
      <form className="date-form" onSubmit={add}>
        <label>
          Nome
          <input value={name} maxLength={60} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label>
          Data
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </label>
        <label className="check">
          <input type="checkbox" checked={recurring} onChange={(e) => setRecurring(e.target.checked)} />
          Repete todo ano
        </label>
        <button className="btn primary">Adicionar</button>
      </form>
    </section>
  )
}

export default function ImportantDatesPage() {
  const [params, setParams] = useSearchParams()
  const [clients, setClients] = useState<ClientSummary[]>([])
  const selected = params.get('cliente') ? Number(params.get('cliente')) : null

  useEffect(() => {
    api<ClientSummary[]>('/api/clients').then(setClients).catch(() => {})
  }, [])

  return (
    <div className="card settings">
      <h1>Datas importantes</h1>
      <p className="muted small">Aparecem como etiquetas no planner. Os feriados nacionais já vêm automaticamente.</p>
      <DateSection title="Gerais (todos os clientes)" clientId={null} />
      <section aria-label="Por cliente" className="date-section">
        <h2>Por cliente</h2>
        <label>
          Cliente
          <select
            value={selected ?? ''}
            onChange={(e) => setParams(e.target.value ? { cliente: e.target.value } : {}, { replace: true })}
          >
            <option value="">Escolha um cliente…</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      </section>
      {selected && (
        <DateSection
          key={selected}
          title={`Datas de ${clients.find((c) => c.id === selected)?.name ?? 'cliente'}`}
          clientId={selected}
        />
      )}
    </div>
  )
}
