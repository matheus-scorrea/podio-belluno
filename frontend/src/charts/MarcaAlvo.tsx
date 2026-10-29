import { Box } from '@mui/material'

export function MarcaAlvo({ posicaoPct }: { posicaoPct: number }) {
  return (
    <Box
      aria-hidden
      sx={{
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: `${posicaoPct}%`,
        width: 3,
        bgcolor: '#0A1128',
        transform: 'translateX(-50%)',
        pointerEvents: 'none',
        borderRadius: 1,
      }}
    />
  )
}
