import { Box, Stack, Typography } from '@mui/material'

export type DegrauEstado = 'feito' | 'atual' | 'proximo' | 'futuro' | 'referencia'

export type DegrauEscada = {
  nome: string
  detalhe?: string
  estado: DegrauEstado
  falta?: string
}

export function EscadaDegraus({ degraus }: { degraus: DegrauEscada[] }) {
  if (degraus.length === 0) {
    return null
  }

  return (
    <Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: 'wrap', alignItems: 'stretch' }}>
      {degraus.map((degrau) => (
        <Box
          key={degrau.nome}
          sx={{
            minWidth: 88,
            px: 1.1,
            py: 0.85,
            borderRadius: 1.5,
            border: '1px solid',
            borderStyle: degrau.estado === 'proximo' ? 'dashed' : 'solid',
            borderColor: borda(degrau.estado),
            bgcolor: fundo(degrau.estado),
            color: texto(degrau.estado),
          }}
        >
          <Typography variant="caption" sx={{ display: 'block', fontWeight: 700, lineHeight: 1.2 }}>
            {degrau.nome}
          </Typography>
          {degrau.detalhe && (
            <Typography variant="caption" sx={{ display: 'block', opacity: 0.85, fontVariantNumeric: 'tabular-nums' }}>
              {degrau.detalhe}
            </Typography>
          )}
          {degrau.falta && (
            <Typography variant="caption" sx={{ display: 'block', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
              {degrau.falta}
            </Typography>
          )}
        </Box>
      ))}
    </Stack>
  )
}

function fundo(estado: DegrauEstado): string {
  if (estado === 'atual') {
    return '#0077B6'
  }
  if (estado === 'feito') {
    return 'rgba(0, 119, 182, 0.10)'
  }
  return '#fff'
}

function texto(estado: DegrauEstado): string {
  if (estado === 'atual') {
    return '#fff'
  }
  if (estado === 'feito') {
    return '#0077B6'
  }
  return 'inherit'
}

function borda(estado: DegrauEstado): string {
  if (estado === 'atual' || estado === 'feito') {
    return '#0077B6'
  }
  if (estado === 'proximo') {
    return '#0077B6'
  }
  return '#E6EAF0'
}
