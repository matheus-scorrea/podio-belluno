import { Stack, Typography } from '@mui/material'
import { formatBonus } from '../lib/labels'
import type { DashboardMeta } from '../types'

export function SeriesPessoasList({ meta }: { meta: DashboardMeta }) {
  const pessoas = (meta.series ?? []).filter((s) => s.usuario_alvo_id != null)
  if (pessoas.length === 0 || meta.chart.tipo === 'column') {
    return null
  }

  return (
    <Stack spacing={0.5} sx={{ px: 1, pt: 1, width: '100%' }}>
      {pessoas.map((pessoa) => (
        <Stack
          key={`${pessoa.usuario_alvo_id}-${pessoa.label}`}
          direction="row"
          spacing={1}
          sx={{ justifyContent: 'space-between', alignItems: 'baseline' }}
        >
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {pessoa.label}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>
            {meta.modo_bonus === 'faixa_unidade'
              ? `${pessoa.escada?.faixa_atual ?? 'Abaixo da primeira faixa'} · ${pessoa.valor} ${meta.unidade} · ${formatBonus(pessoa.escada?.bonus)}`
              : `${pessoa.valor} ${meta.unidade} · ${pessoa.percentual}%`}
          </Typography>
        </Stack>
      ))}
    </Stack>
  )
}
