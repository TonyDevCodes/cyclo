import { useTranslation } from 'react-i18next'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { AppLanguage, TrendPoint } from '../../types'
import { formatMoney } from '../../lib/money'

interface Props {
  data: TrendPoint[]
  currency: string
  language: AppLanguage
}

export function SpendTrendChart({ data, currency, language }: Props) {
  const { t } = useTranslation()

  const hasSpend = data.some((d) => d.monthly > 0)
  if (!hasSpend) {
    return <div className="chart-empty">{t('dashboard.noChartData')}</div>
  }

  const chartData = data.map((d) => ({
    label: d.label,
    value: Number(d.monthly.toFixed(2)),
  }))

  return (
    <div className="chart-wrap">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
          <defs>
            <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F0B34B" stopOpacity={0.5} />
              <stop offset="100%" stopColor="#F0B34B" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--border-soft)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: 'var(--text-mute)', fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: 'var(--border-soft)' }}
          />
          <YAxis
            tick={{ fill: 'var(--text-mute)', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={54}
            tickFormatter={(v) =>
              formatMoney(Number(v), currency, language, { maximumFractionDigits: 0 })
            }
          />
          <Tooltip
            formatter={(value) => formatMoney(Number(value), currency, language)}
            contentStyle={{
              background: 'var(--bg-elev)',
              border: '1px solid var(--border)',
              borderRadius: 10,
            }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="#F0B34B"
            strokeWidth={2}
            fill="url(#trendFill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
