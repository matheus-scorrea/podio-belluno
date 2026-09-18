import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import {
  Box,
  Chip,
  Collapse,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Skeleton,
  Stack,
  Typography,
} from '@mui/material'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { ResultadosAnoChart } from '../charts/ResultadosAnoChart'
import { EmptyState } from '../components/EmptyState'
import { EscopoAtribuicao } from '../components/EscopoAtribuicao'
import { BonusChip } from '../components/MetaDadoChips'
import { FilterBar } from '../components/FilterBar'
import { KpiCard } from '../components/KpiCard'
import { PageHeader } from '../components/PageHeader'
import { AppShell } from '../layout/AppShell'
import { competenciaLabel, formatBonus } from '../lib/labels'
import type { MeusResultadosMes, MeusResultadosResponse } from '../types'

const ANOS = [2025, 2026, 2027]

export function MeusResultadosPage() {
  const [ano, setAno] = useState(2026)
  const [abertos, setAbertos] = useState<number[]>([])

  const { data, isLoading } = useQuery({
    queryKey: ['me-resultados', ano],
    queryFn: async () => (await api.get(`/me/resultados?ano=${ano}`)).data as MeusResultadosResponse,
  })

  useEffect(() => {
    const ultimo = data?.meses.at(-1)?.mes
    setAbertos(ultimo ? [ultimo] : [])
  }, [data])

  function toggle(mes: number) {
    setAbertos((atual) => (atual.includes(mes) ? atual.filter((item) => item !== mes) : [...atual, mes]))
  }

  return (
    <AppShell ano={ano} mes={data?.meses.at(-1)?.mes ?? 9}>
      <PageHeader
        title="Meus resultados"
        subtitle="Sua evolução mês a mês: setor, cargo, metas batidas e bônus."
      />
      <FilterBar>
        <FormControl size="small">
          <InputLabel>Ano</InputLabel>
          <Select label="Ano" value={ano} onChange={(e) => setAno(Number(e.target.value))}>
            {ANOS.map((item) => (
              <MenuItem key={item} value={item}>
                {item}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </FilterBar>

      {isLoading ? (
        <Grid container spacing={2}>
          {[0, 1, 2, 3].map((i) => (
            <Grid key={i} size={{ xs: 12, sm: 6, md: 3 }}>
              <Skeleton variant="rounded" height={112} />
            </Grid>
          ))}
          <Grid size={12}>
            <Skeleton variant="rounded" height={240} />
          </Grid>
        </Grid>
      ) : (
        <>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <KpiCard label="Meses com meta" value={`${data?.kpis.meses_com_meta ?? 0}`} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <KpiCard
                label="Metas batidas"
                value={`${data?.kpis.batidas ?? 0} de ${data?.kpis.metas ?? 0}`}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <KpiCard
                label="Desempenho"
                value={`${data?.kpis.desempenho_medio ?? 0}%`}
                progress={data?.kpis.desempenho_medio}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <KpiCard label="Total ganho" value={formatBonus(data?.kpis.total_bonus)} />
            </Grid>
          </Grid>

          {(data?.meses.length ?? 0) > 0 && (
            <Paper sx={{ p: { xs: 1.25, sm: 2 }, mb: 3, overflow: 'hidden', minWidth: 0 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                Bônus e metas batidas no ano
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: { xs: 1, sm: 1.5 } }}>
                Barras empilhadas: valor de cada meta batida. Linha: quantidade de metas batidas no mês.
              </Typography>
              <ResultadosAnoChart meses={data?.meses ?? []} />
            </Paper>
          )}

          {(data?.meses.length ?? 0) === 0 ? (
            <Paper>
              <EmptyState
                title="Nenhuma competência neste ano"
                description="Quando houver metas no seu recorte, o mês aparece aqui com o retrato de setor e cargo."
              />
            </Paper>
          ) : (
            <Stack spacing={1.5}>
              {(data?.meses ?? []).map((mes) => (
                <MesCard key={mes.mes} mes={mes} ano={ano} aberto={abertos.includes(mes.mes)} onToggle={() => toggle(mes.mes)} />
              ))}
            </Stack>
          )}
        </>
      )}
    </AppShell>
  )
}

function MesCard({
  mes,
  ano,
  aberto,
  onToggle,
}: {
  mes: MeusResultadosMes
  ano: number
  aberto: boolean
  onToggle: () => void
}) {
  return (
    <Paper sx={{ overflow: 'hidden' }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        sx={{
          px: { xs: 1.5, sm: 2 },
          py: 1.5,
          cursor: 'pointer',
          justifyContent: 'space-between',
          alignItems: { sm: 'center' },
        }}
        onClick={onToggle}
      >
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', minWidth: 0 }}>
          <IconButton
            size="small"
            aria-label={aberto ? 'Ocultar metas' : 'Ver metas'}
            onClick={(e) => {
              e.stopPropagation()
              onToggle()
            }}
          >
            <ExpandMoreIcon
              sx={{
                transform: aberto ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.15s',
              }}
            />
          </IconButton>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
              {competenciaLabel(mes.mes, ano)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {[mes.departamento, mes.cargo].filter(Boolean).join(' · ') || 'Sem setor ou cargo neste mês'}
            </Typography>
          </Box>
        </Stack>
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', pl: { xs: 5, sm: 0 } }}>
          <Chip size="small" variant="outlined" label={`${mes.batidas}/${mes.total_metas} batidas`} />
          <BonusChip valor={mes.bonus_total} />
        </Stack>
      </Stack>
      <Collapse in={aberto} timeout="auto" unmountOnExit>
        <Box sx={{ px: { xs: 2, sm: 2.5 }, pb: 2 }}>
          {mes.itens.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              Nenhuma meta no seu recorte nesta competência.
            </Typography>
          ) : (
            <Stack spacing={1}>
              {mes.itens.map((item) => (
                <Stack
                  key={item.meta_id}
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={1}
                  sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' }, py: 0.5 }}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="body2">{item.titulo}</Typography>
                    <Stack direction="row" spacing={0.75} sx={{ mt: 0.4, alignItems: 'center', flexWrap: 'wrap' }}>
                      <EscopoAtribuicao tipo={item.tipo_escopo} />
                      <Chip
                        size="small"
                        label={item.bateu ? 'Bateu' : 'Pendente'}
                        color={item.bateu ? 'success' : 'default'}
                      />
                      <Typography variant="caption" color="text.secondary">
                        {item.percentual}% da meta
                        {item.nivel ? ` · ${item.nivel}` : ''}
                      </Typography>
                    </Stack>
                  </Box>
                  <BonusChip valor={item.valor_bonus} />
                </Stack>
              ))}
            </Stack>
          )}
        </Box>
      </Collapse>
    </Paper>
  )
}
