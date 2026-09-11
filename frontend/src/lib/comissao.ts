export type NivelComissao = {
  nome: string
  venda_min: number
  adesao_min: number
  percentual: number
  premio: number
}

export const TABELA_BELLUNO: NivelComissao[] = [
  { nome: 'META 1', venda_min: 15000, adesao_min: 7500, percentual: 5, premio: 500 },
  { nome: 'META 2', venda_min: 15000, adesao_min: 15000, percentual: 5, premio: 1000 },
  { nome: 'META 3', venda_min: 20000, adesao_min: 10000, percentual: 6, premio: 1000 },
  { nome: 'META 4', venda_min: 20000, adesao_min: 20000, percentual: 6, premio: 1500 },
  { nome: 'META 5', venda_min: 25000, adesao_min: 12500, percentual: 7, premio: 1500 },
  { nome: 'META 6', venda_min: 25000, adesao_min: 25000, percentual: 7, premio: 2000 },
]

export function nivelEmBranco(indice: number): NivelComissao {
  return { nome: `META ${indice}`, venda_min: 0, adesao_min: 0, percentual: 0, premio: 0 }
}

export function formatReais(valor: number): string {
  return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
