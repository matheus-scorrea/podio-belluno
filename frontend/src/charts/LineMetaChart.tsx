import { LineChart } from '@mui/x-charts/LineChart'
import { MESES } from '../lib/labels'
import { escalaPercentual, isUnidadePercentual } from '../lib/percentualViz'
import type { DashboardMeta } from '../types'

export function LineMetaChart({ meta }: { meta: DashboardMeta }) {
  const pct = isUnidadePercentual(meta.unidade)
  const historico = meta.historico ?? []
  const labels =
    historico.length > 0
      ? historico.map((h) => MESES[Number(h.em.slice(5, 7)) - 1]?.slice(0, 3) ?? h.em.slice(5, 7))
      : ['—']
  const values = historico.length > 0 ? historico.map((h) => h.valor) : [0]
  const alvo = values.map(() => meta.valor_meta)
  const max = pct ? escalaPercentual(...values, meta.valor_meta) : undefined

  return (
    <LineChart
      height={180}
      xAxis={[{ data: labels, scaleType: 'point', label: 'Mês' }]}
      yAxis={[{ min: 0, ...(max != null ? { max } : {}), ...(pct ? { label: '%' } : {}) }]}
      series={[
        { data: values, color: meta.chart.cor, label: 'Realizado', showMark: true },
        ...(pct
          ? [{ data: alvo, color: '#0A1128', label: 'Alvo', showMark: false, id: 'alvo' }]
          : []),
      ]}
      margin={{ left: 40, right: 16, top: 16, bottom: 32 }}
    />
  )
}
