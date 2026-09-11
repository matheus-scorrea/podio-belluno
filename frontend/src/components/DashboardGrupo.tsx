import CorporateFareOutlinedIcon from '@mui/icons-material/CorporateFareOutlined'
import PublicOutlinedIcon from '@mui/icons-material/PublicOutlined'
import {
  Avatar,
  Box,
  Chip,
  Divider,
  Grid,
  LinearProgress,
  Paper,
  Stack,
  Typography,
} from '@mui/material'
import type { DashboardGrupo, DashboardGrupoPessoa, DashboardMeta } from '../types'
import { statusColor, statusFromPercentual } from '../theme/status'
import { MetaCard } from './MetaCard'

function iniciais(nome: string): string {
  return nome
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((parte) => parte[0])
    .join('')
    .toUpperCase()
}

function MetaGrid({ metas, compact }: { metas: DashboardMeta[]; compact: boolean }) {
  return (
    <Grid container spacing={2}>
      {metas.map((meta) => (
        <Grid key={meta.id} size={{ xs: 12, md: compact ? 4 : 6, lg: meta.chart.tipo === 'column' || meta.chart.tipo === 'comissao' ? 12 : compact ? 4 : 6 }}>
          <MetaCard meta={meta} compact={compact} />
        </Grid>
      ))}
    </Grid>
  )
}

function PessoaBloco({ pessoa, compact }: { pessoa: DashboardGrupoPessoa; compact: boolean }) {
  const status = statusFromPercentual(pessoa.kpis.desempenho_medio)
  const cor = statusColor(status)

  return (
    <Paper
      variant="outlined"
        sx={{ p: { xs: 1.5, md: 2 }, bgcolor: '#F7F9FB', borderColor: 'divider', boxShadow: 'none' }}
    >
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' }, mb: 2 }}
      >
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
          <Avatar sx={{ bgcolor: '#0A1128', width: 40, height: 40, fontSize: 14 }}>{iniciais(pessoa.nome)}</Avatar>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
              {pessoa.nome}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {pessoa.cargo ?? 'Colaborador'} · {pessoa.kpis.total_ativas} {pessoa.kpis.total_ativas === 1 ? 'meta' : 'metas'}
            </Typography>
          </Box>
        </Stack>
          <Chip size="small" label={`${pessoa.kpis.desempenho_medio}% do recorte`} sx={{ bgcolor: `${cor}22`, color: cor }} />
      </Stack>
      <MetaGrid metas={pessoa.metas} compact={compact} />
    </Paper>
  )
}

export function DashboardGrupoCard({ grupo, compact }: { grupo: DashboardGrupo; compact: boolean }) {
  const status = statusFromPercentual(grupo.kpis.desempenho_medio)
  const cor = statusColor(status)
  const Icon = grupo.tipo === 'global' ? PublicOutlinedIcon : CorporateFareOutlinedIcon
  const pessoasCount = grupo.pessoas.length
  const setorCount = grupo.metas_setor.length

  return (
    <Paper sx={{ p: { xs: 2, md: 2.75 }, overflow: 'hidden' }}>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={2}
        sx={{ justifyContent: 'space-between', alignItems: { md: 'flex-start' }, mb: 1.5 }}
      >
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start' }}>
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: 2,
              bgcolor: grupo.tipo === 'global' ? '#0A1128' : '#00A8E8',
              color: '#fff',
              display: 'grid',
              placeItems: 'center',
              flexShrink: 0,
            }}
          >
            <Icon fontSize="small" />
          </Box>
          <Box>
            <Typography variant="h6" sx={{ lineHeight: 1.2 }}>
              {grupo.nome}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {grupo.subtitulo}
            </Typography>
          </Box>
        </Stack>
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
          <Chip size="small" label={`${grupo.kpis.desempenho_medio}% do recorte`} sx={{ bgcolor: `${cor}22`, color: cor }} />
          <Chip size="small" variant="outlined" label={`${grupo.kpis.concluidas}/${grupo.kpis.total_ativas} concluídas`} />
          {setorCount > 0 && <Chip size="small" variant="outlined" label={`${setorCount} do setor`} />}
          {pessoasCount > 0 && <Chip size="small" variant="outlined" label={`${pessoasCount} ${pessoasCount === 1 ? 'pessoa' : 'pessoas'}`} />}
        </Stack>
      </Stack>
      <LinearProgress
        variant="determinate"
        value={Math.min(Math.max(grupo.kpis.desempenho_medio, 0), 100)}
        sx={{
          height: 8,
          borderRadius: 99,
          bgcolor: '#E2E8F0',
          mb: 2.5,
          '& .MuiLinearProgress-bar': { bgcolor: cor, borderRadius: 99 },
        }}
      />

      {setorCount > 0 && (
        <Box sx={{ mb: pessoasCount > 0 ? 3 : 0 }}>
          <Typography variant="subtitle2" sx={{ mb: 1.5, color: 'text.secondary', letterSpacing: 0.4, textTransform: 'uppercase' }}>
            {grupo.tipo === 'global' ? 'Indicadores da empresa' : 'Metas do setor'}
          </Typography>
          <MetaGrid metas={grupo.metas_setor} compact={compact} />
        </Box>
      )}

      {pessoasCount > 0 && (
        <Box>
          {setorCount > 0 && <Divider sx={{ mb: 2.5 }} />}
          <Typography variant="subtitle2" sx={{ mb: 1.5, color: 'text.secondary', letterSpacing: 0.4, textTransform: 'uppercase' }}>
            Pessoas
          </Typography>
          <Stack spacing={2}>
            {grupo.pessoas.map((pessoa) => (
              <PessoaBloco key={pessoa.id} pessoa={pessoa} compact={compact} />
            ))}
          </Stack>
        </Box>
      )}
    </Paper>
  )
}
