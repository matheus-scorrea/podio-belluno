import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import { Box, Button, Stack, Typography } from '@mui/material'
import { useEffect, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { APP_NAME } from '../lib/brand'

type Props = {
  title: string
  subtitle?: string
  actions?: ReactNode
  backTo?: { href: string; label: string }
}

export function PageHeader({ title, subtitle, actions, backTo }: Props) {
  const navigate = useNavigate()

  useEffect(() => {
    document.title = `${title} · ${APP_NAME}`
    return () => {
      document.title = APP_NAME
    }
  }, [title])

  return (
    <Stack spacing={1.25} sx={{ mb: 3 }}>
      {backTo && (
        <Box>
          <Button startIcon={<ArrowBackIcon />} onClick={() => navigate(backTo.href)} sx={{ ml: -1, color: 'text.secondary' }}>
            {backTo.label}
          </Button>
        </Box>
      )}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={{ justifyContent: 'space-between', alignItems: { sm: 'flex-start' } }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h5" sx={{ lineHeight: 1.25 }}>
            {title}
          </Typography>
          {subtitle && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.6, maxWidth: 640 }}>
              {subtitle}
            </Typography>
          )}
        </Box>
        {actions && (
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
            {actions}
          </Stack>
        )}
      </Stack>
    </Stack>
  )
}
