import type { ChartTipo, DashboardMeta } from '../types'
import { ColumnMetaChart } from './ColumnMetaChart'
import { GaugeMetaChart } from './GaugeMetaChart'
import { LineMetaChart } from './LineMetaChart'
import { MarcoMetaChart } from './MarcoMetaChart'
import { ProgressBarMetaChart } from './ProgressBarMetaChart'

const CHART_MAP = {
  gauge: GaugeMetaChart,
  progress_bar: ProgressBarMetaChart,
  line: LineMetaChart,
  column: ColumnMetaChart,
  marco: MarcoMetaChart,
} as const

export function renderMetaChart(meta: DashboardMeta) {
  const Cmp = CHART_MAP[meta.chart.tipo]
  return <Cmp meta={meta} />
}

export function previewMeta(tipo: ChartTipo, cor: string): DashboardMeta {
  const marco = tipo === 'marco'
  return {
    id: 0,
    titulo: marco ? 'Entregar o marco' : 'Pré-visualização',
    subtitulo: marco ? 'Feito ou pendente' : 'Demo',
    tipo_escopo: 'global',
    valor_meta: marco ? 1 : 100,
    valor_realizado: marco ? 1 : 72,
    unidade: marco ? 'marco' : '%',
    sentido: 'maior_melhor',
    percentual: marco ? 100 : 72,
    status: marco ? 'concluida' : 'esperado',
    pode_lancar: false,
    somente_leitura: false,
    chart: { tipo, cor },
    historico: [
      { em: '2026-07-01', valor: 20 },
      { em: '2026-08-01', valor: 45 },
      { em: '2026-09-01', valor: 72 },
    ],
    series: [
      { label: 'RH', valor: 100, percentual: 100 },
      { label: 'TI', valor: 75, percentual: 75 },
      { label: 'ADM', valor: 50, percentual: 50 },
    ],
  }
}
