import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import { Box, Chip, Paper, Stack, Tooltip, Typography } from '@mui/material'
import { renderMetaChart } from '../charts/chartFactory'
import { bonusCadastroLabel } from '../lib/labels'
import { EscopoAtribuicao } from './EscopoAtribuicao'
import { BonusChip } from './MetaDadoChips'
import { statusColor, statusLabel } from '../theme/status'
import type { DashboardMeta } from '../types'

export function MetaCard({ meta, compact = false }: { meta: DashboardMeta; compact?: boolean }) {
  const faixa = meta.modo_bonus === 'faixa_unidade'
  const comissao = meta.chart.tipo === 'comissao'
  const vendedores = meta.comissao?.vendedores ?? []
  const algumDegrau = vendedores.some((vendedor) => vendedor.nivel)
  const bonusComissao = algumDegrau
    ? vendedores.reduce((soma, vendedor) => soma + Number(vendedor.total ?? 0), 0)
    : Number(meta.comissao?.niveis?.[0]?.premio ?? 0)
  const pessoasFaixa = (meta.series ?? []).filter((serie) => serie.usuario_alvo_id != null && serie.escada)
  const escadaCard = meta.escada ?? (pessoasFaixa.length === 1 ? pessoasFaixa[0].escada : undefined)
  const rotuloStatus = faixa
    ? (escadaCard?.faixa_atual ?? (escadaCard ? 'Abaixo da primeira faixa' : 'Por pessoa'))
    : meta.chart.tipo === 'marco' && meta.status !== 'concluida'
      ? 'Pendente'
      : statusLabel(meta.status)
  const corStatus = faixa
    ? escadaCard?.faixa_atual
      ? '#0077B6'
      : escadaCard
        ? '#EF4444'
        : '#64748B'
    : statusColor(meta.status)

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
          <Typography variant="subtitle1" noWrap sx={{ fontWeight: 600, lineHeight: 1.3 }}>
            {meta.titulo}
          </Typography>
          <Typography variant="body2" color="text.secondary" noWrap>
            {meta.subtitulo}
          </Typography>
          {meta.chart.tipo !== 'marco' && meta.chart.tipo !== 'comissao' && !faixa && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
              {`${meta.valor_realizado} / ${meta.valor_meta} ${meta.unidade}`}
            </Typography>
          )}
          {meta.chart.tipo === 'marco' && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
              {meta.percentual >= 100 ? 'Marco concluído neste período' : 'Marco pendente neste período'}
            </Typography>
          )}
          {meta.chart.tipo === 'comissao' && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
              {meta.status === 'concluida' ? 'Faixa de comissão atingida' : 'Nenhuma faixa atingida ainda'}
            </Typography>
          )}
          {comissao ? (
            <Box sx={{ mt: 1 }}>
              <BonusChip valor={bonusComissao} />
            </Box>
          ) : !faixa ? (
            <Box sx={{ mt: 1 }}>
              <BonusChip valor={meta.valor_bonus} label={bonusCadastroLabel(meta)} />
            </Box>
          ) : null}
        </Box>
        <Stack spacing={0.5} sx={{ alignItems: 'flex-end', flexShrink: 0, maxWidth: { xs: '48%', sm: 240 }, minWidth: 0 }}>
          <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
            {meta.somente_leitura && (
              <Tooltip title="Somente leitura — você não registra esta meta">
                <LockOutlinedIcon fontSize="small" sx={{ color: 'text.secondary' }} />
              </Tooltip>
            )}
            <Chip
              size="small"
              label={rotuloStatus}
              sx={{ bgcolor: `${corStatus}18`, color: corStatus }}
            />
          </Stack>
          <EscopoAtribuicao
            tipo={meta.tipo_escopo}
            departamentos={meta.departamentos}
            cargos={meta.cargos}
            usuarios={meta.usuarios}
            align="end"
          />
        </Stack>
      </Stack>
      <Box sx={{ mt: 1, flex: 1 }}>
        {compact && meta.modo_bonus !== 'faixa_unidade' && meta.chart.tipo !== 'progress_bar' && meta.chart.tipo !== 'marco' && meta.chart.tipo !== 'comissao' ? (
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
