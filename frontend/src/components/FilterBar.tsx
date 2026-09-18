import { Paper, Stack } from '@mui/material'
import type { ReactNode } from 'react'

export function FilterBar({ children }: { children: ReactNode }) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: { xs: 1.5, md: 1.75 },
        mb: 3,
        bgcolor: 'background.paper',
      }}
    >
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={1.5}
        sx={{
          alignItems: { xs: 'stretch', md: 'center' },
          flexWrap: 'wrap',
          '& > .MuiFormControl-root': {
            flex: { xs: '1 1 100%', md: '1 1 180px' },
            minWidth: 0,
          },
        }}
      >
        {children}
      </Stack>
    </Paper>
  )
}
