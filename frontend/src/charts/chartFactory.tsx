import type { ChartTipo, DashboardMeta, Sentido } from '../types'
import { BulletMetaChart } from './BulletMetaChart'
import { ColumnMetaChart } from './ColumnMetaChart'
import { FaixaEscadaChart } from './FaixaEscadaChart'
import { GaugeMetaChart } from './GaugeMetaChart'
import { LineMetaChart } from './LineMetaChart'
import { ComissaoMetaChart } from './ComissaoMetaChart'
import { MarcoMetaChart } from './MarcoMetaChart'
import { ProgressBarMetaChart } from './ProgressBarMetaChart'
import { ProximoGatilhoChart } from './ProximoGatilhoChart'
import { SeriesPessoasList } from './SeriesPessoasList'

const CHART_MAP = {
  gauge: GaugeMetaChart,
  progress_bar: ProgressBarMetaChart,
  bullet: BulletMetaChart,
  line: LineMetaChart,
  column: ColumnMetaChart,
  marco: MarcoMetaChart,
  comissao: ComissaoMetaChart,
} as const

export function renderMetaChart(meta: DashboardMeta) {
  const proximo = meta.visual_escada === 'proximo'
  if (meta.modo_bonus === 'faixa_unidade') {
    return (
      <>
        {proximo ? <ProximoGatilhoChart meta={meta} /> : <FaixaEscadaChart meta={meta} />}
        <SeriesPessoasList meta={meta} />
      </>
    )
  }

  const Cmp = proximo && meta.chart.tipo === 'comissao' ? ProximoGatilhoChart : CHART_MAP[meta.chart.tipo]
  return (
    <>
      <Cmp meta={meta} />
      <SeriesPessoasList meta={meta} />
    </>
  )
}

export function previewMeta(tipo: ChartTipo, cor: string, extras?: { porPessoa?: boolean; unidade?: string; sentido?: Sentido; valorMeta?: number }): DashboardMeta {
  const marco = tipo === 'marco'
  const comissao = tipo === 'comissao'
  const porPessoa = Boolean(extras?.porPessoa)
  const unidade = extras?.unidade ?? (comissao ? 'R$' : marco ? 'marco' : '%')
  const pct = unidade === '%'
  const sentido = extras?.sentido ?? 'maior_melhor'
  const valorMeta = marco ? 1 : extras?.valorMeta && extras.valorMeta > 0 ? extras.valorMeta : pct ? 90 : 100
  const valorRealizado = comissao ? 1750 : marco ? 1 : Math.round(valorMeta * (sentido === 'menor_melhor' ? 0.6 : 0.8) * 100) / 100
  const percentual = comissao || marco ? 100 : valorMeta === 0 ? 0 : Math.round((sentido === 'menor_melhor' ? valorMeta / Math.max(valorRealizado, 0.0001) : valorRealizado / valorMeta) * 100)
  return {
    id: 0,
    titulo: comissao ? 'Comissão de vendedores' : marco ? 'Entregar o marco' : 'Pré-visualização',
    subtitulo: comissao ? 'Receita + adesão' : marco ? 'Feito ou pendente' : 'Demo',
    tipo_escopo: comissao ? 'cargo' : 'global',
    valor_meta: valorMeta,
    valor_realizado: valorRealizado,
    unidade,
    sentido,
    percentual,
    status: comissao || marco ? 'concluida' : 'esperado',
    pode_lancar: false,
    somente_leitura: false,
    chart: { tipo, cor },
    historico: [
      { em: '2026-07-01', valor: Math.round(valorRealizado * 0.7 * 100) / 100 },
      { em: '2026-08-01', valor: Math.round(valorRealizado * 0.85 * 100) / 100 },
      { em: '2026-09-01', valor: valorRealizado },
    ],
    series: porPessoa && !marco
      ? [
          { label: 'Ana', usuario_alvo_id: 1, valor: Math.round(valorMeta * 1.02 * 100) / 100, percentual: 102 },
          { label: 'Bruno', usuario_alvo_id: 2, valor: Math.round(valorMeta * 0.78 * 100) / 100, percentual: 78 },
        ]
      : [
          { label: 'RH', valor: Math.round(valorMeta * 0.91 * 100) / 100, percentual: 91 },
          { label: 'TI', valor: Math.round(valorMeta * 0.78 * 100) / 100, percentual: 78 },
          { label: 'ADM', valor: Math.round(valorMeta * 0.61 * 100) / 100, percentual: 61 },
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
