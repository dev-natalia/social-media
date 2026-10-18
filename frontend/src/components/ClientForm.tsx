import { useEffect, useState, type FormEvent } from 'react'
import { api, ApiError } from '../api/client'
import type { ClientSummary } from '../api/types'
import { resizeImage } from '../lib/image'
import ClientAvatar from './ClientAvatar'
import Modal from './Modal'

const PALETTE = ['#c9b6f2', '#9fd8c0', '#f6c28b', '#f4a7b9', '#a7c7f4', '#e6dd8a']

interface Props {
  client?: ClientSummary
  defaultColor?: string
  onClose: () => void
  onSaved: () => void
}

export function pickColor(index: number): string {
  return PALETTE[index % PALETTE.length]
}

export default function ClientForm({ client, defaultColor = PALETTE[0], onClose, onSaved }: Props) {
  const [name, setName] = useState(client?.name ?? '')
  const [color, setColor] = useState(client?.color ?? defaultColor)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [removeLogo, setRemoveLogo] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!logoFile) return setLogoPreview(null)
    const url = URL.createObjectURL(logoFile)
    setLogoPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [logoFile])

  async function run(action: () => Promise<void>) {
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
    run(async () => {
      const saved = client
        ? await api<ClientSummary>(`/api/clients/${client.id}`, { method: 'PATCH', json: { name, color } })
        : await api<ClientSummary>('/api/clients', { method: 'POST', json: { name, color } })
      if (logoFile) {
        const body = new FormData()
        body.append('file', await resizeImage(logoFile), 'logo.webp')
        await api(`/api/clients/${saved.id}/logo`, { method: 'PUT', body })
      } else if (removeLogo && client?.has_logo) {
        await api(`/api/clients/${saved.id}/logo`, { method: 'DELETE' })
      }
    })
  }

  const showCurrentLogo = client?.has_logo && !removeLogo && !logoFile
  return (
    <Modal title={client ? 'Editar cliente' : 'Novo cliente'} onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <label>
          Nome
          <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} required autoFocus />
        </label>
        <label className="row">
          Cor
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
        </label>
        <div className="logo-field">
          <span className="label">Logo</span>
          <div className="row">
            {logoPreview ? (
              <img className="avatar" src={logoPreview} alt="Pré-visualização do logo" width={48} height={48} />
            ) : showCurrentLogo ? (
              <ClientAvatar client={client!} size={48} />
            ) : (
              <ClientAvatar client={{ id: 0, name: name || '?', color, has_logo: false, logo_version: '' }} size={48} />
            )}
            <label className="btn">
              Escolher imagem
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                hidden
                onChange={(e) => {
                  setLogoFile(e.target.files?.[0] ?? null)
                  setRemoveLogo(false)
                }}
              />
            </label>
            {(logoFile || showCurrentLogo) && (
              <button
                type="button"
                className="link"
                onClick={() => {
                  setLogoFile(null)
                  setRemoveLogo(true)
                }}
              >
                Remover logo
              </button>
            )}
          </div>
        </div>
        {error && <p className="error">{error}</p>}
        <div className="form-actions">
          {client && (
            <button
              type="button"
              className="btn"
              disabled={busy}
              onClick={() =>
                run(async () => {
                  await api(`/api/clients/${client.id}`, { method: 'PATCH', json: { archived: !client.archived } })
                })
              }
            >
              {client.archived ? 'Desarquivar' : 'Arquivar'}
            </button>
          )}
          <span className="spacer" />
          <button type="button" className="btn" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn primary" disabled={busy}>
            Salvar
          </button>
        </div>
      </form>
    </Modal>
  )
}
