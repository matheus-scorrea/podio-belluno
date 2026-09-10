import FlagOutlinedIcon from '@mui/icons-material/FlagOutlined'
import { Box, Typography } from '@mui/material'
import type { ReactNode } from 'react'

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string
  description?: ReactNode
  action?: ReactNode
}) {
  return (
    <Box sx={{ py: 7, px: 2, textAlign: 'center' }}>
      <Box
        sx={{
          width: 48,
          height: 48,
          borderRadius: '50%',
          bgcolor: '#EEF3F7',
          color: 'text.secondary',
          display: 'grid',
          placeItems: 'center',
          mx: 'auto',
          mb: 1.5,
        }}
      >
        <FlagOutlinedIcon fontSize="small" />
      </Box>
      <Typography variant="subtitle1">{title}</Typography>
      {description && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, maxWidth: 420, mx: 'auto' }}>
          {description}
        </Typography>
      )}
      {action && <Box sx={{ mt: 2.5 }}>{action}</Box>}
    </Box>
  )
}
