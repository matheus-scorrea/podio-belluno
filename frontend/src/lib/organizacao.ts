import type { Cargo, Departamento } from '../types'

function idsAtuais(atual?: number | number[] | null): number[] {
  if (atual == null) {
    return []
  }
  return Array.isArray(atual) ? atual : [atual]
}

export function departamentosParaSelect(
  depts: Departamento[] | undefined,
  atualId?: number | number[] | null,
): Departamento[] {
  const manter = new Set(idsAtuais(atualId))
  return (depts ?? []).filter((d) => d.ativo || manter.has(d.id))
}

export function cargosDoSetor(
  depts: Departamento[] | undefined,
  departamentoId: number | '',
  atualId?: number | null,
): Cargo[] {
  const setor = (depts ?? []).find((d) => d.id === departamentoId)
  return (setor?.cargos ?? []).filter((c) => c.ativo || c.id === atualId)
}

export function cargosParaEscopo(depts: Departamento[] | undefined, atuais: number[] = []): Cargo[] {
  return (depts ?? []).flatMap((d) =>
    (d.cargos ?? [])
      .filter((c) => (c.ativo && d.ativo) || atuais.includes(c.id))
      .map((c) => ({ ...c, departamento: d })),
  )
}
