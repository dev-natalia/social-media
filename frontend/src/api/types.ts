export type PostStatus = 'a_fazer' | 'editando' | 'agendado' | 'postado'

export type ChecklistKey = 'roteiro' | 'captacao' | 'edicao' | 'aprovacao' | 'agendamento'
export type Checklist = Record<ChecklistKey, boolean>

export interface User {
  id: number
  email: string
  is_admin: boolean
}

export interface AdminUser extends User {
  is_active: boolean
  created_at: string
}

export interface ColorItem {
  id: number
  name: string
  color: string
  position: number
}

export interface ClientSummary {
  id: number
  name: string
  color: string
  has_logo: boolean
  logo_version: string
  archived: boolean
  week_total: number
  counts: Record<PostStatus, number>
  next_post: { date: string; title: string } | null
}

export interface Post {
  id: number
  client_id: number
  title: string
  date: string
  time: string | null
  content_type: ColorItem
  platforms: ColorItem[]
  format: string | null
  status: PostStatus
  description: string
  drive_url: string | null
  checklist: Checklist
  updated_at: string
}

export interface PostInput {
  title: string
  date: string
  time: string | null
  content_type_id: number
  platform_ids: number[]
  format: string | null
  status: PostStatus
  description: string
  drive_url: string | null
  checklist: Checklist
}

export interface Holiday {
  date: string
  name: string
  hidden: boolean
}

export interface Occurrence {
  id: number
  date: string
  name: string
  client_id: number | null
  recurring_yearly: boolean
}

export interface ImportantDate {
  id: number
  date: string
  name: string
  client_id: number | null
  recurring_yearly: boolean
}

export interface Calendar {
  posts: Post[]
  holidays: Holiday[]
  important_dates: Occurrence[]
}
