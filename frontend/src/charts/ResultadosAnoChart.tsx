import { useId, useMemo } from 'react'
import { Box, useMediaQuery, useTheme } from '@mui/material'
import { BarPlot, FocusedBar } from '@mui/x-charts/BarChart'
import { ChartsAxisHighlight } from '@mui/x-charts/ChartsAxisHighlight'
import { ChartsClipPath } from '@mui/x-charts/ChartsClipPath'
import { ChartsDataProvider } from '@mui/x-charts/ChartsDataProvider'
import { ChartsGrid } from '@mui/x-charts/ChartsGrid'
import { ChartsLegend } from '@mui/x-charts/ChartsLegend'
import { ChartsSurface } from '@mui/x-charts/ChartsSurface'
import { ChartsTooltip } from '@mui/x-charts/ChartsTooltip'
import { ChartsWrapper } from '@mui/x-charts/ChartsWrapper'
import { ChartsXAxis } from '@mui/x-charts/ChartsXAxis'
import { ChartsYAxis } from '@mui/x-charts/ChartsYAxis'
import { LinePlot, MarkPlot } from '@mui/x-charts/LineChart'
import { formatBonus, MESES } from '../lib/labels'
import type { MeusResultadosMes } from '../types'

const CORES = ['#00A8E8', '#0F9F6E', '#D97706', '#7C3AED', '#0077B6', '#E11D48', '#0891B2', '#65A30D']
const LINHA = '#0A1128'
const MESES_CURTO = MESES.map((mes) => mes.slice(0, 3))

function formatEixoBonus(valor: number | null, curto: boolean): string {
  const n = Number(valor ?? 0)
  if (n >= 1000) {
    const mil = (n / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })
    return curto ? `${mil} mil` : `R$ ${mil} mil`
  }
  return curto ? `${n.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}` : `R$ ${n.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`
}

export function ResultadosAnoChart({ meses }: { meses: MeusResultadosMes[] }) {
  const clipId = `${useId()}-clip`
  const theme = useTheme()
  const isXs = useMediaQuery(theme.breakpoints.down('sm'))
  const isMdUp = useMediaQuery(theme.breakpoints.up('md'))
  const { labels, series, maxBatidas } = useMemo(() => montarSeries(meses), [meses])

  return (
    <Box
      sx={{
        width: '100%',
        minWidth: 0,
        height: { xs: 280, sm: 340, md: 380 },
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <ChartsDataProvider
        series={series}
        xAxis={[
          {
            id: 'meses',
            data: labels,
            scaleType: 'band',
            categoryGapRatio: isXs ? 0.28 : 0.42,
            tickLabelInterval: isXs && labels.length > 6 ? (_valor, indice) => indice % 2 === 0 : undefined,
          },
        ]}
        yAxis={[
          {
            id: 'bonus',
            min: 0,
            position: 'left',
            width: isXs ? 44 : isMdUp ? 72 : 56,
            valueFormatter: (valor: number | null) => formatEixoBonus(valor, isXs),
          },
          {
            id: 'batidas',
            min: 0,
            max: Math.max(3, maxBatidas),
            position: 'right',
            width: isXs ? 22 : 32,
            tickMinStep: 1,
            valueFormatter: (valor: number | null) => `${valor ?? 0}`,
          },
        ]}
        margin={{ left: 4, right: 2, top: 10, bottom: isXs ? 2 : 6 }}
      >
        <ChartsWrapper
          extendVertically
          legendDirection="horizontal"
          legendPosition={{ vertical: 'bottom', horizontal: 'start' }}
          sx={{
            width: '100%',
            height: '100%',
            minWidth: 0,
            minHeight: 0,
            justifyItems: 'stretch',
            alignItems: 'stretch',
          }}
        >
          <ChartsSurface sx={{ minWidth: 0, width: '100%' }}>
            <ChartsGrid horizontal />
            <g clipPath={`url(#${clipId})`}>
              <BarPlot borderRadius={isXs ? 2 : 3} />
              <LinePlot />
            </g>
            <MarkPlot />
            <FocusedBar />
            <ChartsAxisHighlight x="line" />
            <ChartsXAxis
              axisId="meses"
              tickLabelStyle={{ fontSize: isXs ? 11 : 12 }}
            />
            <ChartsYAxis axisId="bonus" tickLabelStyle={{ fontSize: isXs ? 10 : 12 }} />
            <ChartsYAxis axisId="batidas" tickLabelStyle={{ fontSize: isXs ? 10 : 12 }} />
            <ChartsClipPath id={clipId} />
          </ChartsSurface>
          <ChartsLegend
            sx={{
              flexWrap: 'wrap',
              columnGap: { xs: 1, sm: 1.5 },
              rowGap: 0.75,
              pt: 1,
              maxHeight: { xs: 72, sm: 80 },
              overflowY: 'auto',
              minWidth: 0,
              '& .MuiChartsLegend-item': {
                minWidth: 0,
                maxWidth: { xs: '100%', sm: 240 },
              },
              '& .MuiChartsLegend-label': {
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              },
            }}
          />
          <ChartsTooltip trigger="axis" />
        </ChartsWrapper>
      </ChartsDataProvider>
    </Box>
  )
}

function montarSeries(meses: MeusResultadosMes[]) {
  const mesesOrdenados = [...meses].sort((a, b) => a.mes - b.mes)
  const labels = mesesOrdenados.map((mes) => MESES_CURTO[mes.mes - 1] ?? String(mes.mes))
  const metas = new Map<number, string>()

  for (const mes of mesesOrdenados) {
    for (const item of mes.itens) {
      if (item.bateu && item.valor_bonus > 0) {
        metas.set(item.meta_id, item.titulo)
      }
    }
  }

  const barras = [...metas.entries()].map(([id, titulo], indice) => ({
    type: 'bar' as const,
    id: `meta-${id}`,
    label: titulo,
    stack: 'bonus',
    yAxisId: 'bonus',
    color: CORES[indice % CORES.length],
    data: mesesOrdenados.map((mes) => {
      const item = mes.itens.find((it) => it.meta_id === id)
      return item?.bateu ? item.valor_bonus : 0
    }),
    valueFormatter: (valor: number | null) => (valor ? formatBonus(valor) : null),
  }))

  const batidas = mesesOrdenados.map((mes) => mes.batidas)

  return {
    labels,
    maxBatidas: Math.max(0, ...batidas),
    series: [
      ...barras,
      {
        type: 'line' as const,
        id: 'batidas',
        label: 'Metas batidas',
        yAxisId: 'batidas',
        color: LINHA,
        curve: 'linear' as const,
        showMark: true,
        data: batidas,
        valueFormatter: (valor: number | null) => {
          const n = valor ?? 0
          return `${n} ${n === 1 ? 'meta' : 'metas'}`
        },
      },
    ],
  }
}
