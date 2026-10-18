import { useCallback, useEffect, useRef, useState, type FormEvent, type MouseEvent } from 'react'
import { api, ApiError } from '../api/client'
import type { Checklist, ColorItem, Post, PostInput, PostStatus } from '../api/types'
import { tint } from '../lib/color'
import { CHECKLIST_ITEMS, FORMAT_SUGGESTIONS, STATUS_LABEL, STATUS_ORDER } from '../lib/labels'

interface Props {
  clientId: number
  post?: Post
  defaultDate?: string
  contentTypes: ColorItem[]
  platforms: ColorItem[]
  onClose: () => void
  onSaved: () => void
}

const EMPTY_CHECKLIST: Checklist = { roteiro: false, captacao: false, edicao: false, aprovacao: false, agendamento: false }

function initialForm(post: Post | undefined, defaultDate: string, contentTypes: ColorItem[]): PostInput {
  if (post) {
    return {
      title: post.title,
      date: post.date,
      time: post.time ? post.time.slice(0, 5) : null,
      content_type_id: post.content_type.id,
      platform_ids: post.platforms.map((p) => p.id),
      format: post.format,
      status: post.status,
      description: post.description,
      drive_url: post.drive_url,
      checklist: { ...EMPTY_CHECKLIST, ...post.checklist },
    }
  }
  return {
    title: '',
    date: defaultDate,
    time: null,
    content_type_id: contentTypes[0]?.id ?? 0,
    platform_ids: [],
    format: null,
    status: 'a_fazer',
    description: '',
    drive_url: null,
    checklist: { ...EMPTY_CHECKLIST },
  }
}

export default function PostPanel({ clientId, post, defaultDate = '', contentTypes, platforms, onClose, onSaved }: Props) {
  const [initial] = useState<PostInput>(() => initialForm(post, defaultDate, contentTypes))
  const [form, setForm] = useState<PostInput>(initial)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const pressedOnBackdrop = useRef(false)
  const [startedAsOther] = useState(() => !!initial.format && !FORMAT_SUGGESTIONS.includes(initial.format))
  const [otherFormat, setOtherFormat] = useState(startedAsOther)

  const dirty = JSON.stringify(form) !== JSON.stringify(initial)
  const requestClose = useCallback(() => {
    if (!dirty || window.confirm('Descartar as alterações deste post?')) onClose()
  }, [dirty, onClose])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && requestClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [requestClose])

  // Só fecha se o clique começou e terminou no fundo (arrastar uma seleção para fora não fecha).
  const onBackdropDown = (e: MouseEvent) => (pressedOnBackdrop.current = e.target === e.currentTarget)
  const onBackdropClick = (e: MouseEvent) => {
    if (pressedOnBackdrop.current && e.target === e.currentTarget) requestClose()
    pressedOnBackdrop.current = false
  }

  const set = <K extends keyof PostInput>(key: K, value: PostInput[K]) => setForm((f) => ({ ...f, [key]: value }))
  const done = CHECKLIST_ITEMS.filter((i) => form.checklist[i.key]).length
  const ctype = contentTypes.find((t) => t.id === form.content_type_id)

  async function run(action: () => Promise<unknown>) {
    setError('')
    setBusy(true)
    try {
      await action()
      onSaved()
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : 'Não foi possível salvar.')
    } finally {
      setBusy(false)
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) return setError('Dê um título ao post.')
    if (!form.content_type_id) return setError('Escolha um tipo de conteúdo.')
    const body = { ...form, title: form.title.trim(), time: form.time || null, drive_url: form.drive_url?.trim() || null }
    run(() =>
      post
        ? api(`/api/posts/${post.id}`, { method: 'PATCH', json: body })
        : api(`/api/clients/${clientId}/posts`, { method: 'POST', json: body }),
    )
  }

  function togglePlatform(id: number) {
    set('platform_ids', form.platform_ids.includes(id) ? form.platform_ids.filter((p) => p !== id) : [...form.platform_ids, id])
  }

  const driveOk = form.drive_url && /^https?:\/\//.test(form.drive_url.trim())

  return (
    <div className="panel-backdrop" onMouseDown={onBackdropDown} onClick={onBackdropClick}>
      <aside
        className="post-panel"
        role="dialog"
        aria-label={post ? 'Editar post' : 'Novo post'}
        style={{ borderTopColor: ctype?.color }}
      >
        <form onSubmit={submit} className="form">
          <div className="modal-head">
            <h2>{post ? 'Editar post' : 'Novo post'}</h2>
            <button type="button" className="icon-btn" aria-label="Fechar" onClick={requestClose}>
              ✕
            </button>
          </div>

          <label>
            Título
            <input value={form.title} maxLength={80} onChange={(e) => set('title', e.target.value)} autoFocus={!post} />
          </label>

          <div className="grid-2">
            <label>
              Data
              <input type="date" value={form.date} required onChange={(e) => set('date', e.target.value)} />
            </label>
            <label>
              Horário
              <input type="time" value={form.time ?? ''} onChange={(e) => set('time', e.target.value || null)} />
            </label>
          </div>

          <label>
            Tipo de conteúdo
            <select
              value={form.content_type_id}
              onChange={(e) => set('content_type_id', Number(e.target.value))}
              style={{ backgroundColor: ctype ? tint(ctype.color) : undefined }}
            >
              {contentTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>

          <div className="field">
            <span className="label">Redes</span>
            <div className="chips">
              {platforms.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="chip"
                  aria-pressed={form.platform_ids.includes(p.id)}
                  onClick={() => togglePlatform(p.id)}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          <div className="field">
            <span className="label" id="format-label">
              Formato
            </span>
            <div className="chips" role="group" aria-labelledby="format-label">
              {FORMAT_SUGGESTIONS.map((f) => (
                <button
                  key={f}
                  type="button"
                  className="chip"
                  aria-pressed={!otherFormat && form.format === f}
                  onClick={() => {
                    setOtherFormat(false)
                    set('format', form.format === f && !otherFormat ? null : f)
                  }}
                >
                  {f}
                </button>
              ))}
              <button
                type="button"
                className="chip"
                aria-pressed={otherFormat}
                onClick={() => {
                  setOtherFormat(!otherFormat)
                  set('format', null)
                }}
              >
                Outro
              </button>
            </div>
            {otherFormat && (
              <label>
                Qual formato?
                <input
                  value={form.format ?? ''}
                  maxLength={30}
                  autoFocus={!startedAsOther}
                  onChange={(e) => set('format', e.target.value || null)}
                />
              </label>
            )}
          </div>

          <div className="field">
            <span className="label">Status</span>
            <div className="segmented" role="radiogroup" aria-label="Status">
              {STATUS_ORDER.map((s) => (
                <label key={s} className={form.status === s ? 'on' : ''}>
                  <input
                    type="radio"
                    name="status"
                    value={s}
                    checked={form.status === s}
                    onChange={() => set('status', s as PostStatus)}
                  />
                  {STATUS_LABEL[s]}
                </label>
              ))}
            </div>
          </div>

          <div className="field">
            <span className="label">
              Checklist <span className="muted">{done}/{CHECKLIST_ITEMS.length}</span>
            </span>
            <div className="checklist">
              {CHECKLIST_ITEMS.map((item) => (
                <label key={item.key} className="check">
                  <input
                    type="checkbox"
                    checked={form.checklist[item.key]}
                    onChange={(e) => set('checklist', { ...form.checklist, [item.key]: e.target.checked })}
                  />
                  {item.label}
                </label>
              ))}
            </div>
          </div>

          <label>
            Descrição
            <textarea
              rows={5}
              value={form.description}
              placeholder="Roteiro, legenda, observações…"
              onChange={(e) => set('description', e.target.value)}
            />
          </label>

          <div className="field">
            <label>
              Link do Google Drive
              <input
                type="text"
                inputMode="url"
                value={form.drive_url ?? ''}
                placeholder="https://drive.google.com/…"
                onChange={(e) => set('drive_url', e.target.value || null)}
              />
            </label>
            {driveOk && (
              <a className="small" href={form.drive_url!.trim()} target="_blank" rel="noopener noreferrer">
                Abrir
              </a>
            )}
          </div>

          {error && <p className="error">{error}</p>}

          <div className="form-actions">
            {post && (
              <>
                <button
                  type="button"
                  className="btn danger"
                  disabled={busy}
                  onClick={() => {
                    if (window.confirm('Excluir este post?')) run(() => api(`/api/posts/${post.id}`, { method: 'DELETE' }))
                  }}
                >
                  Excluir
                </button>
                <button
                  type="button"
                  className="btn"
                  disabled={busy}
                  onClick={() => run(() => api(`/api/posts/${post.id}/duplicate`, { method: 'POST' }))}
                >
                  Duplicar
                </button>
              </>
            )}
            <span className="spacer" />
            <button className="btn primary" disabled={busy}>
              Salvar
            </button>
          </div>
        </form>
      </aside>
    </div>
  )
}
