import { Box, Typography } from '@mui/material'
import { Gauge, gaugeClasses } from '@mui/x-charts/Gauge'
import { formatNumero } from '../lib/labels'
import { desvioEmPp, escalaPercentual, isUnidadePercentual, posicaoNaEscala } from '../lib/percentualViz'
import type { DashboardMeta } from '../types'

export function GaugeMetaChart({ meta }: { meta: DashboardMeta }) {
  const pct = isUnidadePercentual(meta.unidade)
  const max = pct ? escalaPercentual(meta.valor_realizado, meta.valor_meta) : 100
  const value = pct ? Math.min(meta.valor_realizado, max) : Math.min(meta.percentual, 100)
  const anguloAlvo = -110 + (posicaoNaEscala(meta.valor_meta, max) / 100) * 220

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <Box sx={{ position: 'relative', width: 220, height: 160 }}>
        <Gauge
          width={220}
          height={160}
          value={value}
          valueMin={0}
          valueMax={max}
          startAngle={-110}
          endAngle={110}
          sx={{
            [`& .${gaugeClasses.valueText}`]: { fontSize: 22, fontWeight: 700, fontVariantNumeric: 'tabular-nums' },
            [`& .${gaugeClasses.valueArc}`]: { fill: meta.chart.cor },
          }}
          text={() =>
            pct ? `${formatNumero(meta.valor_realizado)}%` : `${meta.valor_realizado} / ${meta.valor_meta}`
          }
        />
        {pct && (
          <Box
            aria-hidden
            sx={{
              position: 'absolute',
              left: '50%',
              top: '58%',
              width: 0,
              height: 0,
              transform: `translate(-50%, -50%) rotate(${anguloAlvo}deg)`,
              pointerEvents: 'none',
            }}
          >
            <Box
              sx={{
                position: 'absolute',
                left: -1.5,
                top: -78,
                width: 3,
                height: 14,
                bgcolor: '#0A1128',
                borderRadius: 1,
              }}
            />
          </Box>
        )}
      </Box>
      <Typography variant="body2" color="text.secondary">
        {pct
          ? `Alvo ${formatNumero(meta.valor_meta)}% · ${desvioEmPp(meta.valor_realizado, meta.valor_meta, meta.sentido)}`
          : `${meta.percentual}% atingido`}
      </Typography>
    </Box>
  )
}
