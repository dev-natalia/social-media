import type { ClientSummary } from '../api/types'
import { formatShortDate } from '../lib/dates'
import { STATUS_LABEL, STATUS_ORDER } from '../lib/labels'
import ClientAvatar from './ClientAvatar'

interface Props {
  client: ClientSummary
  onOpen: (id: number) => void
  onEdit: (client: ClientSummary) => void
}

export default function ClientCard({ client, onOpen, onEdit }: Props) {
  const counts = STATUS_ORDER.filter((s) => client.counts[s] > 0)
  return (
    <article
      className="client-card"
      style={{ borderTopColor: client.color }}
      role="link"
      tabIndex={0}
      onClick={() => onOpen(client.id)}
      onKeyDown={(e) => e.key === 'Enter' && onOpen(client.id)}
    >
      <div className="client-card-head">
        <ClientAvatar client={client} />
        <h2>{client.name}</h2>
        <button
          className="icon-btn"
          aria-label={`Editar ${client.name}`}
          onClick={(e) => {
            e.stopPropagation()
            onEdit(client)
          }}
        >
          ⋯
        </button>
      </div>
      {client.week_total > 0 ? (
        <p>Esta semana: {client.week_total} {client.week_total === 1 ? 'post' : 'posts'}</p>
      ) : (
        <p>Esta semana: nenhum post</p>
      )}
      <div className="pills">
        {client.week_total === 0 && <span className="pill warn">semana vazia</span>}
        {counts.map((s) => (
          <span key={s} className="pill">
            {client.counts[s]} {STATUS_LABEL[s].toLowerCase()}
          </span>
        ))}
      </div>
      {client.next_post && (
        <p className="muted small">
          Próximo: {formatShortDate(client.next_post.date)} · {client.next_post.title}
        </p>
      )}
    </article>
  )
}
