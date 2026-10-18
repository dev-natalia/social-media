import { initials } from '../lib/color'

interface Props {
  client: { id: number; name: string; color: string; has_logo: boolean; logo_version: string }
  size?: number
}

export default function ClientAvatar({ client, size = 36 }: Props) {
  const style = { width: size, height: size, fontSize: size * 0.36 }
  if (client.has_logo) {
    return (
      <img
        className="avatar"
        style={style}
        src={`/api/clients/${client.id}/logo?v=${client.logo_version}`}
        alt={`Logo de ${client.name}`}
      />
    )
  }
  return (
    <span className="avatar" style={{ ...style, background: client.color }} aria-hidden>
      {initials(client.name)}
    </span>
  )
}
