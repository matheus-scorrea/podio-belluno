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

export function formatBonus(valor: number | string | null | undefined): string {
  const n = Number(valor ?? 0)
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
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
