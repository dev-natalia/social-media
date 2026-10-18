import type { PostStatus } from '../api/types'
import { STATUS_LABEL, STATUS_ORDER } from '../lib/labels'

interface Props {
  value: PostStatus[]
  onChange: (value: PostStatus[]) => void
}

export default function StatusFilter({ value, onChange }: Props) {
  function toggle(s: PostStatus) {
    const next = value.includes(s) ? value.filter((v) => v !== s) : [...value, s]
    onChange(STATUS_ORDER.filter((x) => next.includes(x)))
  }
  return (
    <div className="chips" role="group" aria-label="Filtrar por status">
      <button type="button" className="chip" aria-pressed={value.length === 0} onClick={() => onChange([])}>
        Todos
      </button>
      {STATUS_ORDER.map((s) => (
        <button key={s} type="button" className="chip" aria-pressed={value.includes(s)} onClick={() => toggle(s)}>
          {STATUS_LABEL[s]}
        </button>
      ))}
    </div>
  )
}
