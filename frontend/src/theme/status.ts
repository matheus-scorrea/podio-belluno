import type { StatusMeta } from '../types'

export function statusColor(status: StatusMeta): string {
  switch (status) {
    case 'concluida':
      return '#0077B6'
    case 'esperado':
      return '#10B981'
    case 'atencao':
      return '#F59E0B'
    default:
      return '#EF4444'
  }
}

export function statusFromPercentual(percentual: number): StatusMeta {
  if (percentual >= 100) {
    return 'concluida'
  }
  if (percentual >= 70) {
    return 'esperado'
  }
  if (percentual >= 40) {
    return 'atencao'
  }
  return 'abaixo'
}

export function statusLabel(status: StatusMeta): string {
  switch (status) {
    case 'concluida':
      return 'Concluída'
    case 'esperado':
      return 'No ritmo'
    case 'atencao':
      return 'Em risco'
    default:
      return 'Abaixo da meta'
  }
}
