import type { ChecklistKey, PostStatus } from '../api/types'

export const STATUS_ORDER: PostStatus[] = ['a_fazer', 'editando', 'agendado', 'postado']

export const STATUS_LABEL: Record<PostStatus, string> = {
  a_fazer: 'A fazer',
  editando: 'Editando',
  agendado: 'Agendado',
  postado: 'Postado',
}

export const CHECKLIST_ITEMS: { key: ChecklistKey; label: string }[] = [
  { key: 'roteiro', label: 'Roteiro' },
  { key: 'captacao', label: 'Captação/materiais' },
  { key: 'edicao', label: 'Edição/arte' },
  { key: 'aprovacao', label: 'Aprovação' },
  { key: 'agendamento', label: 'Agendamento' },
]

export const FORMAT_SUGGESTIONS = ['Reels', 'Carrossel', 'Story', 'Estático', 'Vídeo']
