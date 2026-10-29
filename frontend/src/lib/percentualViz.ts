import type { ChartTipo, Sentido } from '../types'
import { formatNumero } from './labels'

export function isUnidadePercentual(unidade?: string | null): boolean {
  return (unidade ?? '').trim() === '%'
}

export function escalaPercentual(...valores: number[]): number {
  const finitos = valores.filter((n) => Number.isFinite(n))
  return Math.max(100, ...finitos)
}

export function posicaoNaEscala(valor: number, max: number): number {
  if (max <= 0) {
    return 0
  }
  return Math.min(100, Math.max(0, (valor / max) * 100))
}

export function desvioEmPp(
  realizado: number,
  alvo: number,
  sentido: Sentido = 'maior_melhor',
): string {
  const bruto = Math.round((alvo - realizado) * 10) / 10
  const texto = formatNumero(Math.abs(bruto))
  if (sentido === 'menor_melhor') {
    if (bruto > 0) {
      return `${texto} pp abaixo do teto`
    }
    if (bruto < 0) {
      return `${texto} pp acima do teto`
    }
    return 'no teto'
  }
  if (bruto > 0) {
    return `faltam ${texto} pp`
  }
  if (bruto < 0) {
    return `${texto} pp acima do alvo`
  }
  return 'no alvo'
}

export function rotuloValorPct(realizado: number, alvo: number): string {
  return `${formatNumero(realizado)}% · alvo ${formatNumero(alvo)}%`
}

export function chartsParaUnidade(unidade: string): ChartTipo[] {
  if (isUnidadePercentual(unidade)) {
    return ['gauge', 'progress_bar', 'bullet', 'line', 'column']
  }
  return ['gauge', 'progress_bar', 'line', 'column']
}
