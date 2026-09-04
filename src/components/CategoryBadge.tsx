import { useTranslation } from 'react-i18next'
import type { CategoryId, ThemeMode } from '../types'
import { categoryMeta, categoryColor, categoryGlyphColor } from '../lib/categories'

interface Props {
  category: CategoryId
  /** plain = small square dot + label; default = rounded glyph tile + label. */
  variant?: 'plain' | 'tile'
  hideLabel?: boolean
  /** Active theme, so the fixed category colour picks its light/dark shade. */
  theme?: ThemeMode
}

export function CategoryBadge({ category, variant = 'tile', hideLabel, theme }: Props) {
  const { t } = useTranslation()
  const meta = categoryMeta(category)
  return (
    <span className={`cat-badge${variant === 'plain' ? ' cat-badge--plain' : ''}`}>
      <span
        className="cat-badge__dot"
        style={{
          background: categoryColor(category, theme),
          color: categoryGlyphColor(category, theme),
        }}
        aria-hidden="true"
      >
        {variant === 'tile' ? meta.glyph : ''}
      </span>
      {!hideLabel && <span>{t(`category.${category}`)}</span>}
    </span>
  )
}
