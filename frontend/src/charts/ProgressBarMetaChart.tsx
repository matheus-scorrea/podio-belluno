import { Box, LinearProgress, Typography } from '@mui/material'
import { formatNumero } from '../lib/labels'
import { desvioEmPp, escalaPercentual, isUnidadePercentual, posicaoNaEscala } from '../lib/percentualViz'
import type { DashboardMeta } from '../types'
import { MarcaAlvo } from './MarcaAlvo'

export function ProgressBarMetaChart({ meta }: { meta: DashboardMeta }) {
  const pct = isUnidadePercentual(meta.unidade)
  const max = pct ? escalaPercentual(meta.valor_realizado, meta.valor_meta) : 100
  const value = pct ? posicaoNaEscala(meta.valor_realizado, max) : Math.min(meta.percentual, 100)

  return (
    <Box sx={{ px: 1, py: 2 }}>
      <Typography variant="h4" sx={{ fontVariantNumeric: 'tabular-nums', color: meta.chart.cor, mb: 1 }}>
        {pct ? `${formatNumero(meta.valor_realizado)}%` : `${meta.valor_realizado} ${meta.unidade}`}
      </Typography>
      <Box sx={{ position: 'relative' }}>
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
        {pct && <MarcaAlvo posicaoPct={posicaoNaEscala(meta.valor_meta, max)} />}
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        {pct
          ? `Alvo ${formatNumero(meta.valor_meta)}% · ${desvioEmPp(meta.valor_realizado, meta.valor_meta, meta.sentido)}`
          : `Meta: ${meta.valor_meta} ${meta.unidade} · ${meta.percentual}%`}
      </Typography>
    </Box>
  )
}
