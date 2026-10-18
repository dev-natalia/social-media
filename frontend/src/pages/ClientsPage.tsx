import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, ApiError } from '../api/client'
import type { ClientSummary } from '../api/types'
import ClientCard from '../components/ClientCard'
import ClientForm, { pickColor } from '../components/ClientForm'
import { startOfWeek, todayISO } from '../lib/dates'

export default function ClientsPage() {
  const navigate = useNavigate()
  const [clients, setClients] = useState<ClientSummary[] | null>(null)
  const [error, setError] = useState('')
  const [archived, setArchived] = useState(false)
  const [editing, setEditing] = useState<ClientSummary | 'new' | null>(null)

  const load = useCallback(() => {
    const today = todayISO()
    const params = new URLSearchParams({ week_start: startOfWeek(today), today, archived: String(archived) })
    api<ClientSummary[]>(`/api/clients?${params}`)
      .then(setClients)
      .catch((e) => setError(e instanceof ApiError ? e.detail : 'Não foi possível carregar os clientes.'))
  }, [archived])

  useEffect(load, [load])

  return (
    <>
      <div className="page-head">
        <h1>{archived ? 'Clientes arquivados' : 'Meus clientes'}</h1>
        <button className="link" onClick={() => setArchived(!archived)}>
          {archived ? 'Voltar aos clientes ativos' : 'Ver arquivados'}
        </button>
      </div>
      {error && <p className="error">{error}</p>}
      {clients === null && !error && <p className="muted">Carregando…</p>}
      {clients && (
        <div className="client-grid">
          {clients.map((c) => (
            <ClientCard key={c.id} client={c} onOpen={(id) => navigate(`/clientes/${id}`)} onEdit={setEditing} />
          ))}
          {!archived && (
            <button className="client-card new" onClick={() => setEditing('new')}>
              + Novo cliente
            </button>
          )}
          {archived && clients.length === 0 && <p className="muted">Nenhum cliente arquivado.</p>}
        </div>
      )}
      {editing && (
        <ClientForm
          client={editing === 'new' ? undefined : editing}
          defaultColor={pickColor(clients?.length ?? 0)}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            load()
          }}
        />
      )}
    </>
  )
}
