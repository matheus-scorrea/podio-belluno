import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded'
import RadioButtonUncheckedRoundedIcon from '@mui/icons-material/RadioButtonUncheckedRounded'
import { Box, Stack, Typography } from '@mui/material'
import type { DashboardMeta } from '../types'

export function MarcoMetaChart({ meta }: { meta: DashboardMeta }) {
  const pessoas = meta.marco?.pessoas
  if (pessoas && pessoas.length > 0) {
    const feitos = pessoas.filter((p) => p.feito).length

    return (
      <Stack spacing={1} sx={{ px: 1, py: 1 }}>
        <Typography variant="body2" color="text.secondary">
          {feitos} de {pessoas.length} {pessoas.length === 1 ? 'pessoa concluiu' : 'pessoas concluíram'}
        </Typography>
        {pessoas.map((pessoa) => (
          <Stack key={`${pessoa.usuario_id}-${pessoa.nome}`} direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Box sx={{ color: pessoa.feito ? meta.chart.cor : '#94A3B8', display: 'grid', placeItems: 'center' }}>
              {pessoa.feito ? (
                <CheckCircleRoundedIcon sx={{ fontSize: 22 }} />
              ) : (
                <RadioButtonUncheckedRoundedIcon sx={{ fontSize: 22 }} />
              )}
            </Box>
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 700, color: pessoa.feito ? meta.chart.cor : 'text.secondary' }}>
                {pessoa.nome}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {pessoa.feito ? 'Concluído' : 'Pendente'}
              </Typography>
            </Box>
          </Stack>
        ))}
      </Stack>
    )
  }

  const feito = meta.percentual >= 100

  return (
    <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', px: 1, py: 1.5 }}>
      <Box sx={{ color: feito ? meta.chart.cor : '#94A3B8', display: 'grid', placeItems: 'center' }}>
        {feito ? <CheckCircleRoundedIcon sx={{ fontSize: 48 }} /> : <RadioButtonUncheckedRoundedIcon sx={{ fontSize: 48 }} />}
      </Box>
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 800, color: feito ? meta.chart.cor : 'text.secondary' }}>
          {feito ? 'Concluído' : 'Pendente'}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {feito ? 'O marco foi disparado nesta competência.' : 'Aguardando a conclusão do marco.'}
        </Typography>
      </Box>
    </Stack>
  )
}
