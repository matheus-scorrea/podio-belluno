import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded'
import RadioButtonUncheckedRoundedIcon from '@mui/icons-material/RadioButtonUncheckedRounded'
import { Box, Stack, Typography } from '@mui/material'
import type { DashboardMeta } from '../types'

export function MarcoMetaChart({ meta }: { meta: DashboardMeta }) {
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
