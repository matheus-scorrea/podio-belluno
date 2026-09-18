import { Table, TableContainer } from '@mui/material'
import type { ReactNode } from 'react'

type Props = {
  children: ReactNode
  minWidth?: number
}

export const hideColXs = { display: { xs: 'none', md: 'table-cell' } } as const

export function ResponsiveTable({ children, minWidth = 560 }: Props) {
  return (
    <TableContainer sx={{ overflowX: 'auto', width: '100%' }}>
      <Table sx={{ minWidth }}>{children}</Table>
    </TableContainer>
  )
}
