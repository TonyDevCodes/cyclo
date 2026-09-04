import { useTranslation } from 'react-i18next'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import type { CategoryId, CategorySpend, ThemeMode } from '../../types'
import { categoryColor } from '../../lib/categories'
import { formatMoney } from '../../lib/money'
import type { AppLanguage } from '../../types'

interface Props {
  data: CategorySpend[]
  currency: string
  language: AppLanguage
  theme: ThemeMode
  /** Highest-spend category — its slice gets a bright ring, same fill colour. */
  topCategory?: CategoryId | null
}

export function CategoryDonut({ data, currency, language, theme, topCategory }: Props) {
  const { t } = useTranslation()

  if (data.length === 0) {
    return <div className="chart-empty">{t('dashboard.noChartData')}</div>
  }

  const chartData = data.map((d) => ({
    key: d.category,
    name: t(`category.${d.category}`),
    value: Number(d.monthly.toFixed(2)),
    color: categoryColor(d.category, theme),
  }))

  const ring = theme === 'light' ? '#201a12' : '#f4f4f6'

  return (
    <div className="chart-wrap">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            innerRadius="58%"
            outerRadius="88%"
            paddingAngle={1.5}
            stroke="var(--surface)"
            strokeWidth={2}
          >
            {chartData.map((entry) => {
              const isTop = entry.key === topCategory
              return (
                <Cell
                  key={entry.key}
                  fill={entry.color}
                  stroke={isTop ? ring : 'var(--surface)'}
                  strokeWidth={isTop ? 2.5 : 2}
                />
              )
            })}
          </Pie>
          <Tooltip
            formatter={(value) => formatMoney(Number(value), currency, language)}
            contentStyle={{
              background: 'var(--bg-elev)',
              border: '1px solid var(--border)',
              borderRadius: 10,
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
