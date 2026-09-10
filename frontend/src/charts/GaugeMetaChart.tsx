import { Box, Typography } from '@mui/material'
import { Gauge, gaugeClasses } from '@mui/x-charts/Gauge'
import type { DashboardMeta } from '../types'

export function GaugeMetaChart({ meta }: { meta: DashboardMeta }) {
  const value = Math.min(meta.percentual, 100)

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <Gauge
        width={220}
        height={160}
        value={value}
        startAngle={-110}
        endAngle={110}
        sx={{
          [`& .${gaugeClasses.valueText}`]: { fontSize: 22, fontWeight: 700, fontVariantNumeric: 'tabular-nums' },
          [`& .${gaugeClasses.valueArc}`]: { fill: meta.chart.cor },
        }}
        text={() => `${meta.valor_realizado} / ${meta.valor_meta}`}
      />
      <Typography variant="body2" color="text.secondary">
        {meta.percentual}% atingido
      </Typography>
    </Box>
  )
}
