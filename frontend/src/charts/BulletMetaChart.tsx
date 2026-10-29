import { Box, Typography } from '@mui/material'
import { formatNumero } from '../lib/labels'
import { desvioEmPp, escalaPercentual, posicaoNaEscala } from '../lib/percentualViz'
import { statusColor } from '../theme/status'
import type { DashboardMeta } from '../types'
import { MarcaAlvo } from './MarcaAlvo'

export function BulletMetaChart({ meta }: { meta: DashboardMeta }) {
  const max = escalaPercentual(meta.valor_realizado, meta.valor_meta)
  const realizadoPct = posicaoNaEscala(meta.valor_realizado, max)
  const alvoPct = posicaoNaEscala(meta.valor_meta, max)
  const menorMelhor = meta.sentido === 'menor_melhor'
  const faixaEsperado = posicaoNaEscala(menorMelhor ? meta.valor_meta : Math.min(70, max), max)
  const faixaAtencao = posicaoNaEscala(menorMelhor ? Math.min(meta.valor_meta * 1.5, max) : Math.min(40, max), max)

  return (
    <Box sx={{ px: 1, py: 2 }}>
      <Typography variant="h4" sx={{ fontVariantNumeric: 'tabular-nums', color: meta.chart.cor, mb: 0.5 }}>
        {formatNumero(meta.valor_realizado)}%
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
        Alvo {formatNumero(meta.valor_meta)}% · {desvioEmPp(meta.valor_realizado, meta.valor_meta, meta.sentido)}
      </Typography>
      <Box
        sx={{
          position: 'relative',
          height: 28,
          borderRadius: 1,
          overflow: 'hidden',
        }}
      >
        <Box sx={{ display: 'flex', height: '100%' }}>
          <Box sx={{ width: `${faixaAtencao}%`, bgcolor: `${statusColor(menorMelhor ? 'esperado' : 'abaixo')}33` }} />
          <Box
            sx={{
              width: `${Math.max(0, faixaEsperado - faixaAtencao)}%`,
              bgcolor: `${statusColor('atencao')}33`,
            }}
          />
          <Box sx={{ flex: 1, bgcolor: `${statusColor(menorMelhor ? 'abaixo' : 'esperado')}33` }} />
        </Box>
        <Box
          sx={{
            position: 'absolute',
            left: 0,
            top: 8,
            height: 12,
            width: `${realizadoPct}%`,
            bgcolor: meta.chart.cor,
            borderRadius: 0.5,
          }}
        />
        <MarcaAlvo posicaoPct={alvoPct} />
      </Box>
    </Box>
  )
}
