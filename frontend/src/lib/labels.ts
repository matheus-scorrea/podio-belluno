import type { ChartTipo, TipoEscopo } from '../types'

export const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

export function competenciaLabel(mes: number, ano: number): string {
  return `${MESES[mes - 1] ?? mes} / ${ano}`
}

export const TIPOS_ESCOPO: TipoEscopo[] = ['global', 'departamento', 'cargo', 'individual']

export function escopoLabel(escopo: TipoEscopo | string): string {
  switch (escopo) {
    case 'individual':
      return 'Individual'
    case 'cargo':
      return 'Por cargo'
    case 'departamento':
      return 'Por setor'
    case 'global':
      return 'Empresa'
    default:
      return escopo
  }
}

type EscopoNomes = {
  tipo_escopo: TipoEscopo | string
  departamentos?: { nome: string }[]
  cargos?: { nome: string }[]
  usuarios?: { name: string }[]
}

export function escopoAtribuicaoNomes(meta: EscopoNomes): string[] {
  if (meta.tipo_escopo === 'global') {
    return []
  }

  const nomes =
    meta.tipo_escopo === 'departamento'
      ? (meta.departamentos ?? []).map((item) => item.nome)
      : meta.tipo_escopo === 'cargo'
        ? (meta.cargos ?? []).map((item) => item.nome)
        : meta.tipo_escopo === 'individual'
          ? (meta.usuarios ?? []).map((item) => item.name)
          : []

  return nomes.map((nome) => nome.trim()).filter(Boolean)
}

export function escopoAtribuicao(meta: EscopoNomes, limite = 3): { resumo: string; completo: string } | null {
  const limpos = escopoAtribuicaoNomes(meta)
  if (limpos.length === 0) {
    return null
  }

  const completo = limpos.join(', ')
  const resumo =
    limpos.length > limite ? `${limpos.slice(0, limite).join(', ')} +${limpos.length - limite}` : completo

  return { resumo, completo }
}

export function formatNumero(valor: number | string | null | undefined): string {
  const n = Number(valor ?? 0)
  if (!Number.isFinite(n)) {
    return '0'
  }
  return n.toLocaleString('pt-BR', { maximumFractionDigits: 2 })
}

export function formatAlvo(valor: number | string | null | undefined, unidade?: string | null): string {
  const numero = formatNumero(valor)
  const u = (unidade ?? '').trim()
  if (!u) {
    return numero
  }
  if (u === '%') {
    return `${numero}%`
  }
  return `${numero} ${u}`
}

export function alvoLabel(chartTipo: string, valorMeta: number | string | null | undefined, unidade?: string | null): string {
  if (chartTipo === 'marco') {
    return 'Feito / pendente'
  }
  if (chartTipo === 'comissao') {
    return 'Gatilhos de comissão'
  }
  return formatAlvo(valorMeta, unidade)
}

export function formatBonus(valor: number | string | null | undefined): string {
  const n = Number(valor ?? 0)
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export function bonusCadastroLabel(meta: {
  modo_bonus?: string | null
  valor_bonus?: number | string | null
}): string {
  if (meta.modo_bonus === 'faixa_unidade') {
    return 'Por faixas'
  }
  if (meta.modo_bonus === 'por_unidade') {
    return `${formatBonus(meta.valor_bonus)}/un`
  }
  return formatBonus(meta.valor_bonus)
}

export function chartLabel(tipo: ChartTipo | string): string {
  switch (tipo) {
    case 'gauge':
      return 'Velocímetro'
    case 'progress_bar':
      return 'Barra de progresso'
    case 'line':
      return 'Linha temporal'
    case 'column':
      return 'Barras comparativas'
    case 'marco':
      return 'Por marco'
    case 'comissao':
      return 'Comissão'
    default:
      return tipo
  }
}
