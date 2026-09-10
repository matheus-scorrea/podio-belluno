import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import { Box, Chip, Paper, Stack, Tooltip, Typography } from '@mui/material'
import { renderMetaChart } from '../charts/chartFactory'
import { escopoLabel } from '../lib/labels'
import { statusColor, statusLabel } from '../theme/status'
import type { DashboardMeta } from '../types'

export function MetaCard({ meta, compact = false }: { meta: DashboardMeta; compact?: boolean }) {
  return (
    <Paper
      sx={{
        p: 2.25,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: 'none',
        '&:hover': { borderColor: '#D5DCE6' },
      }}
    >
      <Stack direction="row" spacing={1} sx={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box sx={{ minWidth: 0, pr: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, lineHeight: 1.3 }}>
            {meta.titulo}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {meta.subtitulo}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
            {meta.chart.tipo === 'marco'
              ? meta.percentual >= 100
                ? 'Marco concluído neste período'
                : 'Marco pendente neste período'
              : `${meta.valor_realizado} / ${meta.valor_meta} ${meta.unidade}`}
          </Typography>
        </Box>
        <Stack spacing={0.5} sx={{ alignItems: 'flex-end', flexShrink: 0 }}>
          <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
            {meta.somente_leitura && (
              <Tooltip title="Somente leitura — você não registra esta meta">
                <LockOutlinedIcon fontSize="small" sx={{ color: 'text.secondary' }} />
              </Tooltip>
            )}
            <Chip
              size="small"
              label={meta.chart.tipo === 'marco' && meta.status !== 'concluida' ? 'Pendente' : statusLabel(meta.status)}
              sx={{ bgcolor: `${statusColor(meta.status)}18`, color: statusColor(meta.status) }}
            />
          </Stack>
          <Chip size="small" variant="outlined" label={escopoLabel(meta.tipo_escopo)} />
        </Stack>
      </Stack>
      <Box sx={{ mt: 1, flex: 1 }}>
        {compact && meta.chart.tipo !== 'progress_bar' && meta.chart.tipo !== 'marco' ? (
          <Typography variant="h5" sx={{ fontVariantNumeric: 'tabular-nums', color: meta.chart.cor, mt: 2 }}>
            {meta.percentual}%
          </Typography>
        ) : (
          renderMetaChart(meta)
        )}
      </Box>
    </Paper>
  )
}
