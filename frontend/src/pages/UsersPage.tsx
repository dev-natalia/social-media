import { useEffect, useState, type FormEvent } from 'react'
import { api, ApiError } from '../api/client'
import type { AdminUser } from '../api/types'

export default function UsersPage() {
  const [users, setUsers] = useState<AdminUser[] | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    api<AdminUser[]>('/api/users').then(setUsers).catch(() => setError('Não foi possível carregar.'))
  }, [])

  async function attempt(action: () => Promise<void>) {
    setError('')
    setNotice('')
    try {
      await action()
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : 'Não foi possível salvar.')
    }
  }

  const replace = (u: AdminUser) => setUsers((list) => list!.map((i) => (i.id === u.id ? u : i)))

  function create(e: FormEvent) {
    e.preventDefault()
    attempt(async () => {
      const user = await api<AdminUser>('/api/users', { method: 'POST', json: { email, password } })
      setUsers((list) => [...(list ?? []), user])
      setEmail('')
      setPassword('')
      setNotice(`Conta criada para ${user.email}. Envie a senha provisória para a pessoa.`)
    })
  }

  function resetPassword(u: AdminUser) {
    const pw = window.prompt(`Nova senha para ${u.email} (mínimo 8 caracteres):`)
    if (!pw) return
    attempt(async () => {
      replace(await api<AdminUser>(`/api/users/${u.id}`, { method: 'PATCH', json: { password: pw } }))
      setNotice(`Senha de ${u.email} redefinida.`)
    })
  }

  return (
    <section className="card settings">
      <h1>Usuários</h1>
      {error && <p className="error">{error}</p>}
      {notice && <p className="notice">{notice}</p>}
      {users && (
        <ul className="user-list">
          {users.map((u) => (
            <li key={u.id}>
              <span className="date-name">
                {u.email} {u.is_admin && <span className="pill">admin</span>}
              </span>
              <label className="check small">
                <input
                  type="checkbox"
                  checked={u.is_active}
                  onChange={(e) =>
                    attempt(async () =>
                      replace(await api<AdminUser>(`/api/users/${u.id}`, { method: 'PATCH', json: { is_active: e.target.checked } })),
                    )
                  }
                />
                Ativo
              </label>
              <button className="btn" onClick={() => resetPassword(u)}>
                Redefinir senha
              </button>
            </li>
          ))}
        </ul>
      )}
      <h2>Novo usuário</h2>
      <form className="date-form" onSubmit={create}>
        <label>
          E-mail
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          Senha provisória
          <input type="text" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        <button className="btn primary">Criar usuário</button>
      </form>
    </section>
  )
}
