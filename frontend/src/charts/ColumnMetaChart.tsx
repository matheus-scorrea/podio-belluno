import { BarChart } from '@mui/x-charts/BarChart'
import type { DashboardMeta } from '../types'
import { statusColor } from '../theme/status'

export function ColumnMetaChart({ meta }: { meta: DashboardMeta }) {
  const series = meta.series ?? []
  const labels = series.length > 0 ? series.map((s) => s.label) : ['—']
  const values = series.length > 0 ? series.map((s) => s.percentual) : [0]
  const colors = series.length > 0
    ? series.map((s) => statusColor(s.percentual >= 100 ? 'concluida' : s.percentual >= 70 ? 'esperado' : s.percentual >= 40 ? 'atencao' : 'abaixo'))
    : [meta.chart.cor]

  return (
    <BarChart
      layout="horizontal"
      height={Math.max(160, labels.length * 42)}
      yAxis={[{ data: labels, scaleType: 'band' }]}
      xAxis={[{ min: 0, max: Math.max(100, ...values), label: '%' }]}
      series={[{ data: values, label: '% atingido', color: meta.chart.cor }]}
      colors={colors}
      margin={{ left: 80, right: 16, top: 8, bottom: 32 }}
    />
  )
}
