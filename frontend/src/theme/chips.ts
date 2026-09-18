export const chipDadoSx = {
  height: 22,
  maxWidth: '100%',
  '& .MuiChip-icon': { ml: 0.6, fontSize: 14 },
  '& .MuiChip-label': { px: 0.9, fontSize: 12, fontWeight: 600, fontVariantNumeric: 'tabular-nums' },
} as const

export const chipOutlinedSx = {
  ...chipDadoSx,
  color: 'text.secondary',
  bgcolor: '#F8FAFC',
  borderColor: '#E6EAF0',
} as const

export const chipFilledSx = {
  ...chipDadoSx,
  bgcolor: 'rgba(10, 17, 40, 0.06)',
  color: 'text.primary',
} as const

export const chipBonusSx = {
  ...chipDadoSx,
  bgcolor: 'rgba(0, 119, 182, 0.10)',
  color: '#0077B6',
} as const
