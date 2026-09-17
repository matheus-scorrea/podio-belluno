import type { ChartTipo, DashboardMeta } from '../types'
import { ColumnMetaChart } from './ColumnMetaChart'
import { GaugeMetaChart } from './GaugeMetaChart'
import { LineMetaChart } from './LineMetaChart'
import { ComissaoMetaChart } from './ComissaoMetaChart'
import { MarcoMetaChart } from './MarcoMetaChart'
import { ProgressBarMetaChart } from './ProgressBarMetaChart'
import { SeriesPessoasList } from './SeriesPessoasList'

const CHART_MAP = {
  gauge: GaugeMetaChart,
  progress_bar: ProgressBarMetaChart,
  line: LineMetaChart,
  column: ColumnMetaChart,
  marco: MarcoMetaChart,
  comissao: ComissaoMetaChart,
} as const

export function renderMetaChart(meta: DashboardMeta) {
  const Cmp = CHART_MAP[meta.chart.tipo]
  return (
    <>
      <Cmp meta={meta} />
      <SeriesPessoasList meta={meta} />
    </>
  )
}

export function previewMeta(tipo: ChartTipo, cor: string, extras?: { porPessoa?: boolean }): DashboardMeta {
  const marco = tipo === 'marco'
  const comissao = tipo === 'comissao'
  const porPessoa = Boolean(extras?.porPessoa)
  return {
    id: 0,
    titulo: comissao ? 'Comissão de vendedores' : marco ? 'Entregar o marco' : 'Pré-visualização',
    subtitulo: comissao ? 'Receita + adesão' : marco ? 'Feito ou pendente' : 'Demo',
    tipo_escopo: comissao ? 'cargo' : 'global',
    valor_meta: marco ? 1 : 100,
    valor_realizado: comissao ? 1750 : marco ? 1 : 72,
    unidade: comissao ? 'R$' : marco ? 'marco' : '%',
    sentido: 'maior_melhor',
    percentual: comissao || marco ? 100 : 72,
    status: comissao || marco ? 'concluida' : 'esperado',
    pode_lancar: false,
    somente_leitura: false,
    chart: { tipo, cor },
    historico: [
      { em: '2026-07-01', valor: 20 },
      { em: '2026-08-01', valor: 45 },
      { em: '2026-09-01', valor: 72 },
    ],
    series: porPessoa && !marco
      ? [
          { label: 'Ana', usuario_alvo_id: 1, valor: 100, percentual: 100 },
          { label: 'Bruno', usuario_alvo_id: 2, valor: 40, percentual: 40 },
        ]
      : [
          { label: 'RH', valor: 100, percentual: 100 },
          { label: 'TI', valor: 75, percentual: 75 },
          { label: 'ADM', valor: 50, percentual: 50 },
        ],
    marco: marco && porPessoa
      ? {
          pessoas: [
            { usuario_id: 1, nome: 'Ana', feito: true },
            { usuario_id: 2, nome: 'Bruno', feito: false },
          ],
        }
      : undefined,
    comissao: {
      niveis: [],
      vendedores: [
        {
          usuario_id: 1,
          nome: 'Vendedor demo',
          departamento_id: 1,
          nivel: 'META 2',
          venda: 15000,
          adesao: 15000,
          percentual: 5,
          comissao: 750,
          premio: 1000,
          total: 1750,
        },
      ],
    },
  }
}
