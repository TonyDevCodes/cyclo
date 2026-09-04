import { useTranslation } from 'react-i18next'
import {
  IconCyclo,
  IconDashboard,
  IconInsights,
  IconList,
  IconSettings,
  IconShield,
} from './icons'

export type ViewId = 'dashboard' | 'subscriptions' | 'insights' | 'settings'

const ITEMS: { id: ViewId; icon: typeof IconDashboard }[] = [
  { id: 'dashboard', icon: IconDashboard },
  { id: 'subscriptions', icon: IconList },
  { id: 'insights', icon: IconInsights },
  { id: 'settings', icon: IconSettings },
]

interface Props {
  view: ViewId
  onNavigate: (v: ViewId) => void
}

export function Sidebar({ view, onNavigate }: Props) {
  const { t } = useTranslation()
  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="brand__mark">
          <IconCyclo />
        </span>
        <span>
          <span className="brand__name">{t('app.name')}</span>
          <br />
          <span className="brand__tag">{t('app.tagline')}</span>
        </span>
      </div>

      {ITEMS.map(({ id, icon: Icon }) => (
        <button
          key={id}
          className={`nav-link${view === id ? ' nav-link--active' : ''}`}
          aria-current={view === id ? 'page' : undefined}
          onClick={() => onNavigate(id)}
        >
          <Icon className="nav-link__icon" />
          <span className="nav-link__label">{t(`nav.${id}`)}</span>
        </button>
      ))}

      <div className="sidebar__spacer" />
      <div className="sidebar__foot">
        <div className="sidebar__privacy">
          <IconShield width={13} height={13} />
          {t('settings.footer')}
        </div>
      </div>
    </aside>
  )
}

export function MobileNav({ view, onNavigate }: Props) {
  const { t } = useTranslation()
  return (
    <nav className="mobile-nav">
      {ITEMS.map(({ id, icon: Icon }) => (
        <button
          key={id}
          aria-current={view === id ? 'page' : undefined}
          onClick={() => onNavigate(id)}
        >
          <Icon />
          {t(`nav.${id}`)}
        </button>
      ))}
    </nav>
  )
}
