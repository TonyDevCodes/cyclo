import type { ReactNode } from 'react'
import { IconInbox } from './icons'

interface Props {
  title: string
  body?: string
  action?: ReactNode
  icon?: ReactNode
}

export function EmptyState({ title, body, action, icon }: Props) {
  return (
    <div className="empty">
      <div className="empty__icon">{icon ?? <IconInbox width={42} height={42} />}</div>
      <h3>{title}</h3>
      {body && <p>{body}</p>}
      {action}
    </div>
  )
}
