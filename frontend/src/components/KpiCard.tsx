import { Box, LinearProgress, Paper, Typography } from '@mui/material'
import type { ReactNode } from 'react'

export function KpiCard({
  label,
  value,
  hint,
  progress,
}: {
  label: string
  value: string
  hint?: ReactNode
  progress?: number
}) {
  return (
    <Paper sx={{ p: 2.25, height: '100%' }}>
      <Typography variant="overline" sx={{ color: 'text.secondary', letterSpacing: 0.7, fontSize: 11 }}>
        {label}
      </Typography>
      <Typography variant="h5" sx={{ fontVariantNumeric: 'tabular-nums', mt: 0.5, fontWeight: 700 }}>
        {value}
      </Typography>
      {typeof progress === 'number' && (
        <LinearProgress
          variant="determinate"
          value={Math.min(Math.max(progress, 0), 100)}
          sx={{ mt: 1.5, height: 5, borderRadius: 99, bgcolor: '#E6EAF0' }}
        />
      )}
      {hint && <Box sx={{ mt: 0.75 }}>{hint}</Box>}
    </Paper>
  )
}
