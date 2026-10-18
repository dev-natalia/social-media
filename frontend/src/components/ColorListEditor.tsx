import { useEffect, useState } from 'react'
import { api, ApiError } from '../api/client'
import type { ColorItem } from '../api/types'

interface Props {
  endpoint: '/api/content-types' | '/api/platforms'
  title: string
  hint?: string
}

export default function ColorListEditor({ endpoint, title, hint }: Props) {
  const [items, setItems] = useState<ColorItem[] | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    api<ColorItem[]>(endpoint).then(setItems).catch(() => setError('Não foi possível carregar.'))
  }, [endpoint])

  async function attempt(action: () => Promise<void>) {
    setError('')
    try {
      await action()
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : 'Não foi possível salvar.')
    }
  }

  const replace = (item: ColorItem) => setItems((list) => list!.map((i) => (i.id === item.id ? item : i)))

  function update(item: ColorItem, change: Partial<Pick<ColorItem, 'name' | 'color'>>) {
    attempt(async () => replace(await api<ColorItem>(`${endpoint}/${item.id}`, { method: 'PATCH', json: change })))
  }

  function move(index: number, dir: -1 | 1) {
    const list = [...items!]
    const target = index + dir
    if (target < 0 || target >= list.length) return
    ;[list[index], list[target]] = [list[target], list[index]]
    setItems(list)
    attempt(() => api(`${endpoint}/reorder`, { method: 'PUT', json: { ids: list.map((i) => i.id) } }))
  }

  function remove(item: ColorItem) {
    attempt(async () => {
      await api(`${endpoint}/${item.id}`, { method: 'DELETE' })
      setItems((list) => list!.filter((i) => i.id !== item.id))
    })
  }

  function add() {
    attempt(async () => {
      const item = await api<ColorItem>(endpoint, { method: 'POST', json: { name: 'Novo item', color: '#888888' } })
      setItems((list) => [...(list ?? []), item])
    })
  }

  return (
    <section className="card settings">
      <h1>{title}</h1>
      {hint && <p className="muted small">{hint}</p>}
      {error && <p className="error">{error}</p>}
      {items === null ? (
        <p className="muted">Carregando…</p>
      ) : (
        <ul className="color-list">
          {items.map((item, i) => (
            <li key={item.id}>
              <input
                type="color"
                aria-label={`Cor de ${item.name}`}
                value={item.color}
                onChange={(e) => replace({ ...item, color: e.target.value })}
                onBlur={(e) => update(item, { color: e.target.value })}
              />
              <input
                aria-label={`Nome de ${item.name}`}
                defaultValue={item.name}
                maxLength={40}
                onBlur={(e) => {
                  const name = e.target.value.trim()
                  if (name && name !== item.name) update(item, { name })
                  else e.target.value = item.name
                }}
              />
              <button className="icon-btn" aria-label={`Subir ${item.name}`} disabled={i === 0} onClick={() => move(i, -1)}>
                ↑
              </button>
              <button
                className="icon-btn"
                aria-label={`Descer ${item.name}`}
                disabled={i === items.length - 1}
                onClick={() => move(i, 1)}
              >
                ↓
              </button>
              <button className="icon-btn" aria-label={`Excluir ${item.name}`} onClick={() => remove(item)}>
                🗑
              </button>
            </li>
          ))}
        </ul>
      )}
      <button className="btn" onClick={add}>
        + Adicionar
      </button>
    </section>
  )
}
