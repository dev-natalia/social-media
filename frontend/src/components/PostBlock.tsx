import type { DragEvent } from 'react'
import type { Post } from '../api/types'
import { tint } from '../lib/color'
import { STATUS_LABEL } from '../lib/labels'

interface Props {
  post: Post
  compact?: boolean
  draggable?: boolean
  onClick: (post: Post) => void
}

export const DRAG_TYPE = 'text/x-post-id'

export function postMeta(post: Post): string {
  return [post.platforms.map((p) => p.name).join(', '), post.format].filter(Boolean).join(' · ')
}

export default function PostBlock({ post, compact = false, draggable = false, onClick }: Props) {
  const color = post.content_type.color
  function onDragStart(e: DragEvent) {
    e.dataTransfer.setData(DRAG_TYPE, JSON.stringify({ id: post.id, date: post.date }))
    e.dataTransfer.effectAllowed = 'move'
  }
  return (
    <button
      type="button"
      className={`post-block status-${post.status}${compact ? ' compact' : ''}`}
      style={{ backgroundColor: tint(color), borderLeftColor: color }}
      draggable={draggable}
      onDragStart={draggable ? onDragStart : undefined}
      onClick={() => onClick(post)}
      title={post.title}
    >
      <strong className="post-title">{post.title}</strong>
      {!compact && (
        <>
          <span className="post-type">{post.content_type.name}</span>
          <span className="post-meta">
            <span>{postMeta(post)}</span>
            {post.time && <span>{post.time.slice(0, 5)}</span>}
          </span>
          <span className="status-tag">{STATUS_LABEL[post.status]}</span>
        </>
      )}
    </button>
  )
}
