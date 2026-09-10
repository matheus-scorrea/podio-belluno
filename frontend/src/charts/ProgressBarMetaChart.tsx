import { Box, LinearProgress, Typography } from '@mui/material'
import type { DashboardMeta } from '../types'

export function ProgressBarMetaChart({ meta }: { meta: DashboardMeta }) {
  const value = Math.min(meta.percentual, 100)

  return (
    <Box sx={{ px: 1, py: 2 }}>
      <Typography variant="h4" sx={{ fontVariantNumeric: 'tabular-nums', color: meta.chart.cor, mb: 1 }}>
        {meta.valor_realizado} {meta.unidade}
      </Typography>
      <LinearProgress
        variant="determinate"
        value={value}
        sx={{
          height: 14,
          borderRadius: 99,
          backgroundColor: '#E2E8F0',
          '& .MuiLinearProgress-bar': { backgroundColor: meta.chart.cor, borderRadius: 99 },
        }}
      />
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        Meta: {meta.valor_meta} {meta.unidade} · {meta.percentual}%
      </Typography>
    </Box>
  )
}
