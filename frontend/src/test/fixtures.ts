import type { Calendar, ColorItem, Post } from '../api/types'

export const TYPES: ColorItem[] = [
  { id: 1, name: 'Dica', color: '#3b82f6', position: 0 },
  { id: 2, name: 'Tutorial', color: '#e86a7a', position: 1 },
  { id: 3, name: 'Promoção', color: '#e0b100', position: 2 },
]

export const PLATFORMS: ColorItem[] = [
  { id: 10, name: 'Instagram', color: '#e1306c', position: 0 },
  { id: 11, name: 'TikTok', color: '#111111', position: 1 },
]

let nextId = 100

export function makePost(over: Partial<Post> = {}): Post {
  return {
    id: nextId++,
    client_id: 7,
    title: 'Pão de fermentação natural',
    date: '2026-11-03',
    time: '10:00:00',
    content_type: TYPES[1],
    platforms: [PLATFORMS[0]],
    format: 'Reels',
    status: 'agendado',
    description: '',
    drive_url: null,
    checklist: { roteiro: false, captacao: false, edicao: false, aprovacao: false, agendamento: false },
    updated_at: '2026-10-18T12:00:00Z',
    ...over,
  }
}

export function weekCalendar(): Calendar {
  return {
    posts: [makePost({ id: 1 }), makePost({ id: 2, date: '2026-11-04', title: '5 anos de Trigo!', status: 'editando' })],
    holidays: [{ date: '2026-11-02', name: 'Finados', hidden: false }],
    important_dates: [{ id: 5, date: '2026-11-04', name: 'Aniversário da loja', client_id: 7, recurring_yearly: true }],
  }
}
