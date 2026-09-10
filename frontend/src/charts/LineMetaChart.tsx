import { LineChart } from '@mui/x-charts/LineChart'
import { MESES } from '../lib/labels'
import type { DashboardMeta } from '../types'

export function LineMetaChart({ meta }: { meta: DashboardMeta }) {
  const historico = meta.historico ?? []
  const labels =
    historico.length > 0
      ? historico.map((h) => MESES[Number(h.em.slice(5, 7)) - 1]?.slice(0, 3) ?? h.em.slice(5, 7))
      : ['—']
  const values = historico.length > 0 ? historico.map((h) => h.valor) : [0]

  return (
    <LineChart
      height={180}
      xAxis={[{ data: labels, scaleType: 'point', label: 'Mês' }]}
      series={[{ data: values, color: meta.chart.cor, label: 'Realizado', showMark: true }]}
      margin={{ left: 40, right: 16, top: 16, bottom: 32 }}
    />
  )
}
