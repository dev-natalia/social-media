import { useEffect, useState } from 'react'
import { api } from '../api/client'
import type { Holiday } from '../api/types'
import { formatDayLong } from '../lib/dates'

export default function HolidaysPage() {
  const thisYear = new Date().getFullYear()
  const [year, setYear] = useState(thisYear)
  const [items, setItems] = useState<Holiday[] | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    setItems(null)
    api<Holiday[]>(`/api/holidays?year=${year}`)
      .then(setItems)
      .catch(() => setItems([]))
  }, [year])

  async function toggle(h: Holiday) {
    setError('')
    try {
      await api(`/api/holidays/${h.date}/hide`, { method: h.hidden ? 'DELETE' : 'POST' })
      setItems((list) => list!.map((i) => (i.date === h.date ? { ...i, hidden: !h.hidden } : i)))
    } catch {
      setError('Não foi possível salvar.')
    }
  }

  return (
    <section className="card settings">
      <h1>Feriados nacionais</h1>
      <p className="muted small">Vêm da BrasilAPI. Oculte os que não quer ver no planner.</p>
      <label className="row">
        Ano
        <select value={year} onChange={(e) => setYear(Number(e.target.value))} style={{ width: 'auto' }}>
          <option value={thisYear}>{thisYear}</option>
          <option value={thisYear + 1}>{thisYear + 1}</option>
        </select>
      </label>
      {error && <p className="error">{error}</p>}
      {items === null && <p className="muted">Carregando…</p>}
      {items?.length === 0 && <p className="muted">Não foi possível carregar os feriados agora. Tente mais tarde.</p>}
      {items && items.length > 0 && (
        <ul className="date-list">
          {items.map((h) => (
            <li key={h.date} className={h.hidden ? 'hidden-holiday' : ''}>
              <span className="date-when">{formatDayLong(h.date)}</span>
              <span className="date-name">{h.name}</span>
              <button className="btn" onClick={() => toggle(h)}>
                {h.hidden ? 'Mostrar' : 'Ocultar'}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
