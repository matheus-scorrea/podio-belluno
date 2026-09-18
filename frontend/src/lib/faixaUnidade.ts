export type NivelFaixa = {
  nome: string
  quantidade_min: number
  valor_por_unidade: number
}

export const TABELA_SDR_REUNIOES: NivelFaixa[] = [
  { nome: 'Meta 1', quantidade_min: 20, valor_por_unidade: 10 },
  { nome: 'Meta 2', quantidade_min: 30, valor_por_unidade: 12 },
  { nome: 'Meta 3', quantidade_min: 35, valor_por_unidade: 15 },
]

export function faixaEmBranco(indice: number): NivelFaixa {
  return { nome: `Meta ${indice}`, quantidade_min: 0, valor_por_unidade: 0 }
}
