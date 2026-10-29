import { Box } from '@mui/material'
import { BarChart } from '@mui/x-charts/BarChart'
import { escalaPercentual, isUnidadePercentual, posicaoNaEscala } from '../lib/percentualViz'
import type { DashboardMeta } from '../types'
import { statusColor } from '../theme/status'
import { MarcaAlvo } from './MarcaAlvo'

const MARGIN = { left: 80, right: 16, top: 8, bottom: 32 }

export function ColumnMetaChart({ meta }: { meta: DashboardMeta }) {
  const pct = isUnidadePercentual(meta.unidade)
  const series = meta.series ?? []
  const labels = series.length > 0 ? series.map((s) => s.label) : ['—']
  const values = series.length > 0 ? series.map((s) => (pct ? s.valor : s.percentual)) : [0]
  const max = pct ? escalaPercentual(...values, meta.valor_meta) : Math.max(100, ...values)
  const colors = series.length > 0
    ? series.map((s) => statusColor(s.percentual >= 100 ? 'concluida' : s.percentual >= 70 ? 'esperado' : s.percentual >= 40 ? 'atencao' : 'abaixo'))
    : [meta.chart.cor]

  return (
    <Box sx={{ position: 'relative' }}>
      <BarChart
        layout="horizontal"
        height={Math.max(160, labels.length * 42)}
        yAxis={[{ data: labels, scaleType: 'band' }]}
        xAxis={[{ min: 0, max, label: pct ? '%' : '% atingido' }]}
        series={[{ data: values, label: pct ? 'Valor' : '% atingido', color: meta.chart.cor }]}
        colors={colors}
        margin={MARGIN}
      />
      {pct && (
        <Box
          sx={{
            position: 'absolute',
            top: MARGIN.top,
            bottom: MARGIN.bottom,
            left: MARGIN.left,
            right: MARGIN.right,
            pointerEvents: 'none',
          }}
        >
          <MarcaAlvo posicaoPct={posicaoNaEscala(meta.valor_meta, max)} />
        </Box>
      )}
    </Box>
  )
}
